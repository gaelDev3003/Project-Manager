import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  PRD_SYSTEM_PROMPT_V4,
  makePRDCreatePromptV4,
  makePRDReviewerPromptV4,
} from '@/lib/prompts/prd-template';
import { makeScopeReviewerPrompt } from '@/lib/prompts/scope-reviewer-prompt';
import { makeAPIReviewerPrompt } from '@/lib/prompts/api-reviewer-prompt';
import { validatePRDV4 } from '@/lib/prd-schema';
import type { PRDV4 } from '@/lib/prd-schema';
import { autoFillScope, validateScope } from '@/lib/scope-enhancer';
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

      if (!content) throw new Error('Empty content from OpenAI');

      try {
        return JSON.parse(content);
      } catch {
        console.log(`[LLM] JSON parse failed, trying extractFirstJson`);
        return JSON.parse(extractFirstJson(content));
      }
    } catch (error: unknown) {
      const duration = Date.now() - t0;
      console.log(
        `[LLM] attempt=${attempt + 1} failed after ${duration}ms:`,
        (error as Error)?.message || 'Unknown error'
      );

      if (attempt === maxRetries) {
        throw error;
      }

      // AbortError, 408, 429, 5xx에 대해서만 재시도
      const errorObj = error as { name?: string; message?: string };
      const shouldRetry =
        errorObj?.name === 'AbortError' ||
        errorObj?.message?.includes('408') ||
        errorObj?.message?.includes('429') ||
        errorObj?.message?.includes('5');

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, idea } = await request.json();

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
    }

    // Verify project ownership if projectId is provided
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Generate PRD (V4) and run enhanced reviewer loop with Scope/API sub-loops
    const totalStartTime = Date.now();
    let prdData = await generatePRD(idea);

    // Ensure prompt_version is explicitly set to PRD_V4
    prdData.prompt_version = 'PRD_V4';

    // Auto-fill scope from key_features
    prdData = autoFillScope(prdData);

    let errors = await validatePRD_V4(prdData);

    // Always run a reviewer pass to self-critique and improve
    const reviewStartTime = Date.now();
    prdData = await reviewPRD_V4(prdData, errors);
    const reviewDuration = Date.now() - reviewStartTime;

    // Scope 전용 서브 루프
    const scopeStartTime = Date.now();
    const scopeIssues = validateScope(prdData);
    if (
      scopeIssues.length > 0 ||
      !prdData.scope.out_of_scope ||
      prdData.scope.out_of_scope.length === 0
    ) {
      const scopeResult = await reviewScope_V4(prdData);
      prdData.scope = scopeResult.scope;
    }
    const scopeDuration = Date.now() - scopeStartTime;

    // API 계약 전용 서브 루프
    const apiStartTime = Date.now();
    const apiIssues = validateAPIEndpoints(prdData);
    if (
      apiIssues.length > 0 ||
      !prdData.api_endpoints ||
      prdData.api_endpoints.length === 0
    ) {
      const apiResult = await reviewAPI_V4(prdData);
      prdData.api_endpoints = apiResult.api_endpoints;
    }
    const apiDuration = Date.now() - apiStartTime;

    // 최종 검증
    errors = await validatePRD_V4(prdData);

    if (errors.length > 0) {
      console.warn('[PRD_V4] validation failed after review:', errors);
    }

    // Save PRD to database only if projectId is provided
    let savedPrdId: string | null = null;
    if (projectId) {
      const { data: prd, error: saveError } = await supabase
        .from('project_prds')
        .insert({
          project_id: projectId,
          prd_data: prdData,
        })
        .select()
        .single();

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 });
      }

      savedPrdId = prd.id;

      // PRD 생성 및 리뷰 로그 저장
      await savePRDLog(
        savedPrdId,
        null,
        'generation',
        'initial',
        { idea },
        prdData,
        [],
        Date.now() - totalStartTime
      );
      await savePRDLog(
        savedPrdId,
        null,
        'review',
        'first_review',
        prdData,
        prdData,
        errors,
        reviewDuration
      );
      if (scopeIssues.length > 0 || scopeDuration > 0) {
        await savePRDLog(
          savedPrdId,
          null,
          'scope_review',
          'scope_loop',
          prdData,
          { scope: prdData.scope },
          scopeIssues,
          scopeDuration
        );
      }
      if (apiIssues.length > 0 || apiDuration > 0) {
        await savePRDLog(
          savedPrdId,
          null,
          'api_review',
          'api_loop',
          prdData,
          { api_endpoints: prdData.api_endpoints },
          apiIssues,
          apiDuration
        );
      }
      await savePRDLog(
        savedPrdId,
        null,
        'validation',
        'final',
        prdData,
        null,
        errors,
        Date.now() - totalStartTime
      );

      // Extract and save features if they exist
      if (prdData.features && prdData.features.length > 0) {
        const { extractFeaturesFromPRD } = await import(
          '@/lib/features-generator'
        );
        const features = extractFeaturesFromPRD(prdData);

        // Use upsert function for atomic feature creation
        const { error: upsertError } = await supabase.rpc(
          'upsert_prd_features',
          {
            _project: projectId,
            _version: prd.id, // Use PRD ID as version for initial creation
            _features: features,
            _user: user.id,
          }
        );

        if (upsertError) {
          console.error('Error upserting features:', upsertError);
          // Compensating transaction: delete the PRD
          await supabase.from('project_prds').delete().eq('id', prd.id);

          return NextResponse.json(
            { error: 'Failed to save features. PRD creation rolled back.' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ prd });
    } else {
      // Return PRD data without saving to database
      return NextResponse.json({ prd: prdData });
    }
  } catch (error) {
    console.error('PRD generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// removed PRD_EXAMPLES (SQL 금지 정책)

// PRD_V4 생성기
async function generatePRD(
  idea: string,
  previousErrors?: string[]
): Promise<PRDV4> {
  const prompt = makePRDCreatePromptV4(idea, previousErrors);

  try {
    const data = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V4, prompt);
    console.log('[LLM][create] v=PRD_V4');
    return data;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      summary: `사용자 아이디어: ${idea}`,
      why: '사용자 문제/의도를 간략히 설명하세요',
      goals: ['D30 내 활성 사용자 ≥ 100'],
      scope: { in_scope: [], out_of_scope: [] },
      key_features: [],
      schema_summary: { entities: [] },
      api_endpoints: [],
      implementation_phases: [],
      definition_of_done: ['핵심 사용자 시나리오 동작 검증'],
      risks: [],
      prompt_version: 'PRD_V4',
    };
  }
}

async function validatePRD_V4(prd: PRDV4): Promise<string[]> {
  const res = validatePRDV4(prd);
  if (res.ok) return [];
  return res.errors;
}

async function reviewPRD_V4(base: unknown, issues: string[]): Promise<PRDV4> {
  const prompt = makePRDReviewerPromptV4(base, issues);
  const data = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V4, prompt);
  console.log('[LLM][review] v=PRD_V4');
  // Ensure prompt_version is always PRD_V4 after review
  data.prompt_version = 'PRD_V4';
  return data as PRDV4;
}

/**
 * Scope 전용 reviewer
 */
async function reviewScope_V4(
  base: PRDV4
): Promise<{ scope: { in_scope: string[]; out_of_scope: string[] } }> {
  const prompt = makeScopeReviewerPrompt(base, base.key_features || []);
  const data = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V4, prompt);
  console.log('[LLM][scope_review] v=PRD_V4');
  return data as { scope: { in_scope: string[]; out_of_scope: string[] } };
}

/**
 * API 계약 전용 reviewer
 */
async function reviewAPI_V4(base: PRDV4): Promise<{ api_endpoints: any[] }> {
  const entities = base.schema_summary?.entities;
  const prompt = makeAPIReviewerPrompt(base, entities);
  const data = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V4, prompt);
  console.log('[LLM][api_review] v=PRD_V4');
  return data as { api_endpoints: any[] };
}

/**
 * API endpoints 검증
 */
function validateAPIEndpoints(prd: PRDV4): string[] {
  const issues: string[] = [];

  if (!prd.api_endpoints || prd.api_endpoints.length === 0) {
    issues.push('api_endpoints가 비어있습니다.');
    return issues;
  }

  for (const endpoint of prd.api_endpoints) {
    // POST/PUT/PATCH는 request_body 필수
    if (
      ['POST', 'PUT', 'PATCH'].includes(endpoint.method) &&
      !endpoint.request_body
    ) {
      issues.push(
        `${endpoint.method} ${endpoint.path}: request_body 샘플 JSON이 필요합니다.`
      );
    }

    // 모든 endpoint는 response 샘플 필요
    if (!endpoint.response) {
      issues.push(
        `${endpoint.method} ${endpoint.path}: response 샘플 JSON이 필요합니다.`
      );
    }

    // error_codes 최소 1개 필요
    if (
      !endpoint.error_codes ||
      Object.keys(endpoint.error_codes).length === 0
    ) {
      issues.push(
        `${endpoint.method} ${endpoint.path}: error_codes가 필요합니다.`
      );
    }
  }

  return issues;
}

/**
 * PRD 로그 저장 (품질 트래킹)
 */
async function savePRDLog(
  projectPrdId: string | null,
  prdVersionId: string | null,
  logType:
    | 'generation'
    | 'review'
    | 'scope_review'
    | 'api_review'
    | 'validation',
  stage: string,
  inputData: unknown,
  outputData: unknown | null,
  issues: string[],
  durationMs: number
) {
  try {
    const { error } = await supabase.from('prd_logs').insert({
      project_prd_id: projectPrdId,
      prd_version_id: prdVersionId,
      log_type: logType,
      stage,
      input_data: inputData as any,
      output_data: outputData as any,
      issues: issues as any,
      resolved: issues.length === 0,
      duration_ms: durationMs,
    });

    if (error) {
      console.error('[PRD_LOG] Failed to save log:', error);
      // 로그 저장 실패는 PRD 생성 실패로 처리하지 않음 (비중요)
    }
  } catch (error) {
    console.error('[PRD_LOG] Unexpected error saving log:', error);
  }
}
