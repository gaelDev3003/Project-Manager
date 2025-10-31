import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import {
  PRD_SYSTEM_PROMPT_V4,
  makePRDReviewerPromptV4,
} from '@/lib/prompts/prd-template';
import type { Feature } from '@/types/prd';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Environment configuration
const OPENAI_PRD_MODEL = (process.env.OPENAI_PRD_MODEL ?? 'gpt-4o-mini').trim();
const OPENAI_PRD_TEMPERATURE = Number(
  process.env.OPENAI_PRD_TEMPERATURE ?? '0.2'
);
const REQ_TIMEOUT_MS = Number(process.env.REQ_TIMEOUT_MS ?? '45000');

function extractFirstJson(s: string) {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON found in response');
  return m[0];
}

async function callOpenAIJSON(systemPrompt: string, userPrompt: string) {
  const maxRetries = 2;
  const baseDelay = 800; // 0.8초

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);

    try {
      console.log(`[LLM] attempt=${attempt + 1}, model=${OPENAI_PRD_MODEL}`);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_PRD_MODEL,
          temperature: OPENAI_PRD_TEMPERATURE,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      const duration = Date.now() - t0;
      console.log(
        `[LLM] model=${OPENAI_PRD_MODEL}, dur_ms=${duration}, status=${res.status}, prompt_v=PRD_V4`
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`[LLM] API error: ${res.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '';
      console.log(`[LLM] content_len=${content?.length ?? -1}`);
      console.log(`[LLM] content_preview=${content?.substring(0, 500)}...`);

      if (!content) throw new Error('Empty content from OpenAI');

      try {
        const parsed = JSON.parse(content);
        console.log(`[LLM] parsed keys=${Object.keys(parsed).join(',')}`);
        return parsed;
      } catch {
        console.log(`[LLM] JSON parse failed, trying extractFirstJson`);
        const extracted = extractFirstJson(content);
        console.log(
          `[LLM] extracted_preview=${extracted.substring(0, 500)}...`
        );
        return JSON.parse(extracted);
      }
    } catch (error: unknown) {
      const duration = Date.now() - t0;
      const errorObj = error as { message?: string };
      console.log(
        `[LLM] attempt=${attempt + 1} failed after ${duration}ms:`,
        errorObj?.message || 'Unknown error'
      );

      if (attempt === maxRetries) {
        throw error;
      }

      // AbortError, 408, 429, 5xx에 대해서만 재시도
      const errorWithName = error as { name?: string; message?: string };
      const shouldRetry =
        errorWithName?.name === 'AbortError' ||
        errorWithName?.message?.includes('408') ||
        errorWithName?.message?.includes('429') ||
        errorWithName?.message?.includes('5');

      if (shouldRetry) {
        const delay = baseDelay * Math.pow(1.3, attempt);
        console.log(`[LLM] retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    } finally {
      clearTimeout(to);
    }
  }
}

function getAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

type V4FeatureLite = {
  name?: string;
  description?: string;
  notes?: string;
  priority?: string;
  risk?: string;
  effort?: string;
};
type V4EndpointLite = { method?: string; path?: string; description?: string };

async function generateRevisionLLM(base: unknown, feedbackText: string) {
  // API 키 확인
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  const userPrompt = makePRDReviewerPromptV4(base, [feedbackText]);

  try {
    const parsed = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V4, userPrompt);
    console.log('[LLM][revise] v=PRD_V4');

    // Ensure prompt_version is always PRD_V4
    parsed.prompt_version = 'PRD_V4';

    // V4 변환: content_md 생성, summary_json은 V4 그대로 저장
    const content_md = `# ${parsed.summary}\n\n## Why\n${parsed.why || ''}\n\n## Goals\n${parsed.goals?.map((g: string) => `- ${g}`).join('\n') || ''}\n\n## Key Features\n${parsed.key_features?.map((f: V4FeatureLite) => `- **${f.name}**: ${f.description || f.notes || ''} (P:${f.priority || 'N/A'}, R:${f.risk || 'N/A'}, E:${f.effort || 'N/A'})`).join('\n') || ''}\n\n## Schema Summary\n${parsed.schema_summary ? JSON.stringify(parsed.schema_summary, null, 2) : ''}\n\n## API Endpoints\n${parsed.api_endpoints?.map((e: V4EndpointLite) => `- **${e.method}** ${e.path}: ${e.description}`).join('\n') || ''}\n\n## DoD\n${parsed.definition_of_done?.map((d: string) => `- ${d}`).join('\n') || ''}`;
    const converted = {
      content_md,
      summary_json: parsed,
      diagram_mermaid: 'graph TD; A[Start] --> B[Revised];',
    };

    return converted;
  } catch (error) {
    console.error('LLM API Error:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let supabase = getServerSupabase();

    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();

    if (!cookieUser) {
      // Fallback to Authorization header if cookie session absent
      const token = getAuthToken(request);
      if (!token)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Use service client for token validation
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const {
        data: { user: tokenUser },
      } = await supabase.auth.getUser(token);
      if (!tokenUser)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionId, message } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    let version;
    let projectPrdId;

    if (versionId) {
      // locate the version and owning project_prd
      const { data: versionData, error: vErr } = await supabase
        .from('project_prd_versions')
        .select(
          'id, project_prd_id, version, content_md, summary_json, diagram_mermaid'
        )
        .eq('id', versionId)
        .single();
      if (vErr || !versionData)
        return NextResponse.json(
          { error: 'Version not found' },
          { status: 404 }
        );

      version = versionData;
      projectPrdId = version.project_prd_id;
    } else {
      // No versionId provided - find v0 (hidden) version to base v1 on
      const { data: prdData, error: prdErr } = await supabase
        .from('project_prds')
        .select('id')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (prdErr || !prdData) {
        return NextResponse.json(
          { error: 'Project PRD not found' },
          { status: 404 }
        );
      }

      // Find v0 version
      const { data: v0Version, error: v0Err } = await supabase
        .from('project_prd_versions')
        .select('*')
        .eq('project_prd_id', prdData.id)
        .eq('version', 0)
        .single();

      if (v0Err || !v0Version) {
        return NextResponse.json(
          { error: 'Base v0 version not found' },
          { status: 404 }
        );
      }

      version = v0Version;
      projectPrdId = prdData.id;
    }

    // insert feedback (applied=false initially)
    const { data: userResp } = await supabase.auth.getUser();
    const authorId = userResp.user?.id;
    const { error: fbErr } = await supabase
      .from('project_prd_feedbacks')
      .insert({
        prd_version_id: version.id, // Use the found version's ID
        author_id: authorId,
        message: message,
        applied: false,
      });
    if (fbErr)
      return NextResponse.json({ error: fbErr.message }, { status: 500 });

    // compute next version
    const { data: maxRows } = await supabase
      .from('project_prd_versions')
      .select('version')
      .eq('project_prd_id', projectPrdId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = (maxRows?.[0]?.version || 0) + 1;

    console.log(
      'Starting LLM generation for version:',
      version.id,
      'with message:',
      message
    );
    console.log('Base version data:', {
      content_md: version.content_md,
      summary_json: version.summary_json,
      diagram_mermaid: version.diagram_mermaid,
    });

    const revision = await generateRevisionLLM(
      {
        content_md: version.content_md,
        summary_json: version.summary_json,
        diagram_mermaid: version.diagram_mermaid,
      },
      message
    );
    console.log('LLM generation completed successfully');
    console.log('Generated revision:', revision);

    console.log('Creating v1 version with data:', {
      project_prd_id: projectPrdId,
      version: nextVersion,
      status: 'draft',
      created_by: authorId,
    });

    const { data: inserted, error: insErr } = await supabase
      .from('project_prd_versions')
      .insert({
        project_prd_id: projectPrdId,
        version: nextVersion,
        status: 'draft',
        content_md: revision.content_md,
        summary_json: revision.summary_json,
        diagram_mermaid: revision.diagram_mermaid,
        created_by: authorId,
      })
      .select('*')
      .single();

    if (insErr) {
      console.error('Error creating v1 version:', insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    console.log('v1 version created successfully:', inserted.id);

    // Extract and save minimal features for the new version (v0 format)
    const { extractFeaturesFromPRD } = await import('@/lib/features-generator');
    console.log(
      'Extracting features from revision.summary_json:',
      revision.summary_json
    );

    let features: Feature[] = [];
    try {
      features = extractFeaturesFromPRD(revision.summary_json);
      console.log('Features extracted successfully:', features);
    } catch (error) {
      console.error('Error in extractFeaturesFromPRD:', error);
      // Don't throw error, just log and continue without features
      features = [];
    }

    console.log('Extracted features:', features);
    console.log('Features type:', typeof features);
    console.log('Features is array:', Array.isArray(features));
    console.log('First feature:', features[0]);

    // Only save features if we have any
    if (features && features.length > 0) {
      console.log('Saving features to database...');

      // Insert features using simple insert (v0 format)
      const featureRecords = features.map((feature) => ({
        project_id: params.id,
        prd_version_id: inserted.id,
        name: feature.name,
        created_by: authorId,
      }));

      const { error: insertError } = await supabase
        .from('prd_features')
        .insert(featureRecords);

      if (insertError) {
        console.error('Error inserting features:', insertError);
        // Rollback: delete the new PRD version
        await supabase
          .from('project_prd_versions')
          .delete()
          .eq('id', inserted.id);

        return NextResponse.json(
          { error: 'Failed to save features' },
          { status: 500 }
        );
      }

      console.log('Features inserted successfully');
    } else {
      console.log('No features to save');
    }

    // mark feedback applied and update current pointer
    // Use versionId if provided, otherwise use version.id from the base version
    const feedbackVersionId = versionId || version.id;
    await supabase
      .from('project_prd_feedbacks')
      .update({ applied: true })
      .eq('prd_version_id', feedbackVersionId)
      .eq('author_id', authorId)
      .eq('message', message);

    await supabase
      .from('project_prds')
      .update({ current_version: nextVersion })
      .eq('id', projectPrdId);

    return NextResponse.json({ version: inserted });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
