import { z } from 'zod';

// Utility: detect SQL keywords quickly
const containsSQL = (s: unknown): boolean => {
  if (typeof s !== 'string') return false;
  const lowered = s.toLowerCase();
  return (
    lowered.includes('create table') ||
    lowered.includes('create index') ||
    lowered.includes('alter table') ||
    lowered.includes('drop table')
  );
};

// Goals: 정량 목표(quantitative)와 정성 목표(qualitative) 분리
// 정량 목표: 시간 제약(D30, Q2 등)과 비교 연산자가 포함된 검증 가능한 목표
const quantGoal = z
  .string()
  .min(3)
  .refine(
    (val) => {
      // D30, D90, Q1, Q2 등 시간 제약 패턴 또는 비교 연산자 + 숫자
      const hasTimeConstraint = /D\d+|Q\d+|H\d+|W\d+|M\d+/.test(val);
      const hasComparator = /[<>]=?|==|>=|<=|=/.test(val) && /\d/.test(val);
      return hasTimeConstraint || hasComparator;
    },
    {
      message:
        '정량 goals는 시간 제약(D30, Q2 등) 또는 비교 연산자(>, >=, <, <=, =)와 숫자를 포함해야 합니다.',
    }
  );

// 정성 목표: UX, 유지보수성 등 측정 가능한 기준이 있는 목표
const qualGoal = z
  .string()
  .min(3)
  .refine(
    (val) => {
      // UX, accessibility, maintainability 등의 키워드가 포함된 경우 정성 목표로 간주
      const qualitativeKeywords = [
        'ux',
        'user experience',
        'usability',
        'accessibility',
        'maintainability',
        '유지보수',
        '사용성',
        '접근성',
        '성능',
        '확장성',
        '안정성',
      ];
      const lower = val.toLowerCase();
      return qualitativeKeywords.some((keyword) => lower.includes(keyword));
    },
    {
      message:
        '정성 goals는 UX, 유지보수성, 접근성 등 측정 가능한 기준 키워드를 포함해야 합니다.',
    }
  );

// Goals는 정량 또는 정성 목표를 포함해야 함
const goalUnion = z.union([quantGoal, qualGoal]);

const FeatureSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  risk: z.enum(['high', 'medium', 'low']).optional(),
  effort: z.enum(['high', 'medium', 'low']).optional(),
  impacts: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const SchemaSummary = z.object({
  entities: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        fields: z.array(
          z.object({
            name: z.string().min(1),
            type: z.enum(['string', 'number', 'boolean', 'date', 'json']),
            notes: z.string().optional(),
          })
        ),
        relationships: z.array(z.string()).optional(),
      })
    )
    .min(1),
});

// API 계약 강화: request/response 샘플 JSON 포함
const ApiEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().min(1),
  description: z.string().min(1),
  auth_required: z.boolean(),
  request_body: z.record(z.string(), z.any()).optional(), // 샘플 request JSON
  request_schema: z.record(z.string(), z.any()).optional(), // JSON Schema 형식 (옵션)
  response: z.record(z.string(), z.any()).optional(), // 샘플 response JSON
  response_schema: z.record(z.string(), z.any()).optional(), // JSON Schema 형식 (옵션)
  error_codes: z.record(z.string(), z.string()).optional(), // { "400": "Bad Request", "401": "Unauthorized" }
  rate_limit: z
    .object({
      requests_per_minute: z.number().optional(),
      requests_per_hour: z.number().optional(),
    })
    .optional(),
});

const ImplementationPhaseSchema = z.object({
  phase: z.string().min(1),
  title: z.string().min(1),
  tasks: z.array(z.string()).min(1),
  estimated_hours: z.number().min(1),
  acceptance_criteria: z.array(z.string()).min(1),
});

export const PRDV4Schema = z
  .object({
    summary: z.string().min(1),
    why: z.string().min(1),
    goals: z.array(goalUnion).min(1),
    scope: z.object({
      in_scope: z.array(z.string()).default([]),
      out_of_scope: z.array(z.string()).default([]),
    }),
    key_features: z.array(FeatureSchema).default([]),
    features: z.array(FeatureSchema).optional(),
    schema_summary: SchemaSummary,
    api_endpoints: z.array(ApiEndpointSchema).default([]),
    implementation_phases: z.array(ImplementationPhaseSchema).default([]),
    nfrs: z
      .object({
        performance: z.record(z.string(), z.any()).optional(),
        availability: z.string().optional(),
        security: z.array(z.string()).optional(),
        privacy: z.array(z.string()).optional(),
        observability: z.array(z.string()).optional(),
        accessibility: z.array(z.string()).optional(),
        i18n: z.array(z.string()).optional(),
      })
      .optional(),
    definition_of_done: z.array(z.string()).min(1),
    out_of_scope: z.array(z.string()).optional(),
    risks: z
      .array(z.object({ risk: z.string(), mitigation: z.string() }))
      .default([]),
    prompt_version: z.literal('PRD_V4'),
  })
  .superRefine((val, ctx) => {
    // Ensure no SQL strings exist anywhere obvious
    if (val.schema_summary?.entities) {
      for (const e of val.schema_summary.entities) {
        if (containsSQL(e.description)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['schema_summary', 'entities', e.name, 'description'],
            message: 'SQL 금지: schema_summary 설명에 SQL이 포함되었습니다.',
          });
        }
        for (const f of e.fields) {
          if (containsSQL(f.notes)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [
                'schema_summary',
                'entities',
                e.name,
                'fields',
                f.name,
                'notes',
              ],
              message: 'SQL 금지: 필드 notes에 SQL이 포함되었습니다.',
            });
          }
        }
      }
    }
  });

export type PRDV4 = z.infer<typeof PRDV4Schema>;

export function validatePRDV4(data: unknown) {
  const res = PRDV4Schema.safeParse(data);
  if (!res.success) {
    return {
      ok: false as const,
      errors: res.error.issues.map(
        (i) => `${i.path.join('.') || '(root)'}: ${i.message}`
      ),
    };
  }
  return { ok: true as const, data: res.data };
}
