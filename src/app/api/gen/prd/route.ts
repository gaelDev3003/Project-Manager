import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PRDData } from '@/types/prd';
import { PRD_SYSTEM_PROMPT_V3, makePRDCreatePrompt } from '@/lib/prompts/prd-template';
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
      return NextResponse.json(
        { error: 'Idea is required' },
        { status: 400 }
      );
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
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Generate PRD using OpenAI with validation and retry
    let prdData = await generatePRD(idea);
    let errors = await validatePRD(prdData);

    // Retry if validation fails
    if (errors.length > 0) {
      console.log('PRD validation failed, retrying...', errors);
      prdData = await generatePRD(idea, errors);
      errors = await validatePRD(prdData);

      if (errors.length > 0) {
        console.warn('PRD validation still failed after retry:', errors);
      }
    }

    // Save PRD to database only if projectId is provided
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

      // Extract and save features if they exist
      if (prdData.features && prdData.features.length > 0) {
        const { extractFeaturesFromPRD } = await import(
          '@/lib/features-generator'
        );
        const features = extractFeaturesFromPRD(prdData);

        // Use upsert function for atomic feature creation
        const { error: upsertError } = await supabase.rpc('upsert_prd_features', {
          _project: projectId,
          _version: prd.id, // Use PRD ID as version for initial creation
          _features: features,
          _user: user.id,
        });

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

const PRD_EXAMPLES = `
예시 입력: "URL 기반 노트 앱"

예시 출력:
{
  "api_endpoints": [
    {
      "method": "POST",
      "path": "/api/sources/create",
      "description": "URL 스크래핑 및 요약 생성",
      "request_body": {
        "notebook_id": "uuid",
        "url": "string",
        "type": "url"
      },
      "response": {
        "source_id": "uuid",
        "title": "string",
        "summary": "string"
      },
      "auth_required": true,
      "error_codes": {
        "400": "Invalid URL format",
        "422": "Scraping failed",
        "429": "Rate limit exceeded"
      }
    }
  ],
  "database_schema": {
    "tables": [
      {
        "name": "sources",
        "sql": "CREATE TABLE sources (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  notebook_id UUID REFERENCES notebooks(id),\\n  url TEXT,\\n  summary TEXT,\\n  created_at TIMESTAMPTZ DEFAULT NOW()\\n);",
        "indexes": ["CREATE INDEX idx_sources_notebook ON sources(notebook_id);"],
        "rls_policy": "CREATE POLICY sources_policy ON sources\\n  FOR ALL USING (notebook_id IN (\\n    SELECT id FROM notebooks WHERE owner_id = auth.uid()\\n  ));"
      }
    ]
  },
  "implementation_phases": [
    {
      "phase": "Phase 0",
      "title": "DB & Auth",
      "estimated_hours": 4,
      "tasks": [
        "Supabase 프로젝트 생성",
        "위 SQL 실행하여 스키마 생성",
        "RLS 정책 테스트 (다른 유저 접근 403 확인)"
      ],
      "acceptance_criteria": [
        "psql로 테이블 생성 확인",
        "Postman으로 타 유저 접근 시 403 반환"
      ]
    }
  ]
}
`;

// PRD_SYSTEM_PROMPT는 이제 중앙화된 PRD_SYSTEM_PROMPT_V3 사용

async function generatePRD(
  idea: string,
  previousErrors?: string[]
): Promise<PRDData> {
  const prompt = makePRDCreatePrompt(idea, previousErrors);

  try {
    const data = await callOpenAIJSON(PRD_SYSTEM_PROMPT_V3, prompt);
    console.log('[LLM][create] v=PRD_V3');
    const prdData = data; // JSON 객체

    // Validate structure
    if (
      !prdData.summary ||
      !Array.isArray(prdData.goals) ||
      !Array.isArray(prdData.key_features)
    ) {
      throw new Error('Invalid PRD structure received');
    }

    return prdData;
  } catch (error) {
    console.error('OpenAI API error:', error);

    // Fallback PRD structure
    return {
      summary: `사용자 아이디어: ${idea}`,
      goals: ['프로젝트 목표를 정의하세요'],
      key_features: ['주요 기능을 나열하세요'],
      out_of_scope: ['범위 밖 기능을 명시하세요'],
      risks: ['잠재적 위험 요소를 식별하세요'],
      acceptance: ['수용 기준을 정의하세요'],
      technical_requirements: {
        frontend: [],
        backend: [],
        database: [],
        infrastructure: [],
      },
      implementation_phases: [],
      database_schema: { tables: [] },
      api_endpoints: [],
    };
  }
}

async function validatePRD(prd: PRDData): Promise<string[]> {
  const errors: string[] = [];

  if (!prd.api_endpoints || prd.api_endpoints.length < 5) {
    errors.push(
      `API 엔드포인트가 5개 미만 (현재: ${prd.api_endpoints?.length || 0}개)`
    );
  }

  if (prd.api_endpoints) {
    for (const endpoint of prd.api_endpoints) {
      if (
        !endpoint.error_codes ||
        Object.keys(endpoint.error_codes).length === 0
      ) {
        errors.push(`${endpoint.path}에 error_codes 누락`);
      }
    }
  }

  // 스키마 어그노스틱 검증: 관계형 또는 비관계형 중 하나는 반드시 존재
  if (prd.database_schema) {
    const hasRelational = (prd.database_schema.relational?.tables?.length ?? 0) > 0;
    const hasNonRelational = (prd.database_schema.non_relational?.collections?.length ?? 0) > 0;
    const hasLegacyTables = (prd.database_schema.tables?.length ?? 0) > 0; // 기존 호환성
    
    if (!hasRelational && !hasNonRelational && !hasLegacyTables) {
      errors.push('데이터 스키마: 관계형 또는 비관계형 중 하나는 반드시 포함되어야 합니다');
    }
  } else {
    errors.push('데이터 스키마가 누락되었습니다');
  }

  if (!prd.implementation_phases || prd.implementation_phases.length === 0) {
    errors.push('구현 단계 누락');
  } else {
    for (const phase of prd.implementation_phases) {
      if (!phase.acceptance_criteria || phase.acceptance_criteria.length < 3) {
        errors.push(`${phase.phase}에 acceptance_criteria가 3개 미만`);
      }
    }
  }

  // Features validation - MANDATORY 5-7 features (PRD_V3)
  if (!prd.features || !Array.isArray(prd.features)) {
    errors.push('features 배열이 누락되었습니다');
  } else if (prd.features.length < 5) {
    errors.push(
      `features가 5개 미만 (현재: ${prd.features.length}개) - 최소 5개 필요 (PRD_V3)`
    );
  } else if (prd.features.length > 7) {
    errors.push(
      `features가 7개 초과 (현재: ${prd.features.length}개) - 최대 7개 권장`
    );
  } else {
    // Validate each feature structure
    for (let i = 0; i < prd.features.length; i++) {
      const feature = prd.features[i];
      if (!feature.name || typeof feature.name !== 'string') {
        errors.push(`features[${i}]에 name 필드가 누락되었습니다`);
      }
      if (
        !feature.priority ||
        !['high', 'medium', 'low'].includes(feature.priority)
      ) {
        errors.push(
          `features[${i}]에 유효한 priority 필드가 필요합니다 (high|medium|low)`
        );
      }
      if (!feature.risk || !['high', 'medium', 'low'].includes(feature.risk)) {
        errors.push(
          `features[${i}]에 유효한 risk 필드가 필요합니다 (high|medium|low)`
        );
      }
      if (
        feature.effort &&
        !['low', 'medium', 'high'].includes(feature.effort)
      ) {
        errors.push(
          `features[${i}]에 유효한 effort 필드가 필요합니다 (low|medium|high)`
        );
      }
    }
  }

  // NFR 필드 존재 검사 (경고 수준)
  if (!prd.nfrs) {
    console.warn('NFRs 섹션이 누락되었습니다 - 성능, 가용성, 보안 등이 포함되어야 합니다');
  } else {
    if (!prd.nfrs.performance && !prd.nfrs.availability && !prd.nfrs.security) {
      console.warn('NFRs에 핵심 필드(performance, availability, security)가 누락되었습니다');
    }
  }

  return errors;
}
