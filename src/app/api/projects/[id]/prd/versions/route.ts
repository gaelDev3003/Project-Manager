import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { PRD_SYSTEM_PROMPT_V3, makePRDRevisePrompt } from '@/lib/prompts/prd-template';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Environment configuration
const MODEL_PROVIDER = (process.env.MODEL_PROVIDER ?? 'openai').toLowerCase();
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
        `[LLM] model=${OPENAI_PRD_MODEL}, dur_ms=${duration}, status=${res.status}, prompt_v=PRD_V3`
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`[LLM] API error: ${res.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '';
      console.log(`[LLM] content_len=${content?.length ?? -1}`);

      if (!content) throw new Error('Empty content from OpenAI');

      try {
        return JSON.parse(content);
      } catch {
        console.log(`[LLM] JSON parse failed, trying extractFirstJson`);
        return JSON.parse(extractFirstJson(content));
      }
    } catch (error: any) {
      const duration = Date.now() - t0;
      console.log(
        `[LLM] attempt=${attempt + 1} failed after ${duration}ms:`,
        error?.message || 'Unknown error'
      );

      if (attempt === maxRetries) {
        throw error;
      }

      // AbortError, 408, 429, 5xx에 대해서만 재시도
      const shouldRetry =
        error?.name === 'AbortError' ||
        error?.message?.includes('408') ||
        error?.message?.includes('429') ||
        error?.message?.includes('5');

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

async function generateRevisionLLM(base: any, feedbackText?: string) {
  const userPrompt = makePRDRevisePrompt(base, feedbackText || '');
  try {
    const parsed = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V3, userPrompt);
    console.log('[LLM][versions] v=PRD_V3');
    if (parsed?.content_md && parsed?.diagram_mermaid && parsed?.summary_json)
      return parsed;
  } catch {}
  return {
    content_md:
      '# PRD Revision\n\nNo LLM available. This is a placeholder revision.',
    summary_json: { sections: [], kpi: [], risks: [], endpoints: [] },
    diagram_mermaid: 'graph TD; A[Start] --> B[Placeholder];',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Fallback to Authorization header if cookie session absent
      const token = getAuthToken(request);
      if (!token)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Use service client for token validation
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const {
        data: { user: tokenUser },
      } = await serviceClient.auth.getUser(token);
      if (!tokenUser)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // find latest project_prd row for project
    const { data: prdRow, error: prdErr } = await supabase
      .from('project_prds')
      .select('id')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (prdErr || !prdRow) {
      return NextResponse.json({ versions: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '20');
    const offset = Number(searchParams.get('offset') || '0');

    const { data: versions, error } = await supabase
      .from('project_prd_versions')
      .select('*')
      .eq('project_prd_id', prdRow.id)
      .gt('version', 0) // Exclude v0 versions (version > 0)
      .order('version', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ versions: versions || [] });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Fallback to Authorization header if cookie session absent
      const token = getAuthToken(request);
      if (!token)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Use service client for token validation
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const {
        data: { user: tokenUser },
      } = await serviceClient.auth.getUser(token);
      if (!tokenUser)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseVersionId, feedbackText } = await request.json();

    // locate project_prd
    const { data: prdRow, error: prdErr } = await supabase
      .from('project_prds')
      .select('id, current_version, prd_data')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (prdErr || !prdRow)
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 });

    // compute next version
    const { data: maxRows } = await supabase
      .from('project_prd_versions')
      .select('version')
      .eq('project_prd_id', prdRow.id)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = (maxRows?.[0]?.version || 0) + 1;

    // load base
    let base: any = null;
    if (baseVersionId) {
      const { data: baseV, error: baseErr } = await supabase
        .from('project_prd_versions')
        .select('id, content_md, summary_json, diagram_mermaid')
        .eq('id', baseVersionId)
        .single();
      if (baseErr)
        return NextResponse.json({ error: baseErr.message }, { status: 400 });
      base = baseV;
    } else {
      base = prdRow.prd_data || {};
    }

    const revision = await generateRevisionLLM(base, feedbackText);

    // current user id (needed for created_by)
    const { data: userResp } = await supabase.auth.getUser();
    const createdBy = userResp.user?.id;

    const { data: inserted, error: insErr } = await supabase
      .from('project_prd_versions')
      .insert({
        project_prd_id: prdRow.id,
        version: nextVersion,
        status: 'draft',
        content_md: revision.content_md,
        summary_json: revision.summary_json,
        diagram_mermaid: revision.diagram_mermaid,
        created_by: createdBy,
      })
      .select('*')
      .single();

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });

    // update current_version pointer
    await supabase
      .from('project_prds')
      .update({ current_version: nextVersion })
      .eq('id', prdRow.id);

    return NextResponse.json({ version: inserted });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
