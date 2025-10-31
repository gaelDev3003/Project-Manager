// PRD_V3 - 중앙화된 프롬프트 시스템
// 품질 규칙: API ≥5, Data 스키마(관계형/비관계형), Features 5-7개, NFRs 포함

// PRD_V3 템플릿 제거 (V4로 통일)

// PRD_V4 - 의도 중심형 템플릿 (수량 강제 제거, Why/Scope/DoD 추가, SQL 금지 → Schema Summary)
export const PRD_SYSTEM_PROMPT_V4 = `당신은 경험 많은 프로덕트 매니저입니다. 주어진 아이디어의 "의도"를 정확히 반영하는 PRD를 작성합니다.

핵심 원칙 (PRD_V4):
- 형식이 아닌 의도 중심으로 서술하되, 최종 출력은 JSON이어야 함
- 수량 강제(예: API 개수, 기능 개수) 금지
- Why/Scope/Definition of Done(DoD) 필수
- SQL 금지: 스키마는 "schema_summary"로 요약 (엔티티/필드/관계 중심)
- goals는 정량 기준을 포함한 검증 가능한 표현이어야 함 (예: "D30 내 활성 사용자 ≥ 1,000명")

출력 형식(JSON):
{
  "summary": "한 줄 요약",
  "why": "왜 이 제품을 만드는가 (문제/기회/의도)",
  "goals": ["정량 기준 포함 목표"],
  "scope": {
    "in_scope": ["범위 내"],
    "out_of_scope": ["범위 밖"]
  },
  "key_features": [
    {
      "name": "기능명",
      "priority": "high|medium|low",
      "risk": "high|medium|low",
      "effort": "high|medium|low",
      "impacts": ["영향"],
      "dependencies": ["의존성"],
      "notes": "설명"
    }
  ],
  "schema_summary": {
    "entities": [
      {
        "name": "엔티티명",
        "description": "간단 설명",
        "fields": [
          { "name": "필드명", "type": "string|number|boolean|date|json", "notes": "옵션" }
        ],
        "relationships": ["관계 설명 (예: user 1:N project)"]
      }
    ]
  },
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE|PATCH",
      "path": "/api/...",
      "description": "의도 중심 설명",
      "auth_required": true,
      "request_body": { "sample": "JSON 객체" }, // POST/PUT/PATCH의 경우 샘플 JSON 필수
      "response": { "id": "uuid", "data": "..." }, // 모든 endpoint의 성공 응답 샘플 필수
      "error_codes": { "400": "Bad Request", "401": "Unauthorized", "404": "Not Found", "500": "Internal Server Error" }, // 최소 3개 이상
      "rate_limit": { "requests_per_minute": 60 } // 선택
    }
  ],
  "implementation_phases": [
    {
      "phase": "Phase 0",
      "title": "제목",
      "tasks": ["작업"],
      "estimated_hours": 8,
      "acceptance_criteria": ["기준"]
    }
  ],
  "nfrs": {
    "performance": {},
    "availability": "",
    "security": [],
    "privacy": [],
    "observability": [],
    "accessibility": [],
    "i18n": []
  },
  "definition_of_done": ["DoD 목록"],
  "out_of_scope": ["제외 항목"],
  "risks": [{ "risk": "", "mitigation": "" }],
  "prompt_version": "PRD_V4"
}

규칙:
- 어떤 형태의 SQL도 생성하지 마세요. (예: CREATE TABLE, CREATE INDEX 등 금지)
- schema_summary만 사용하여 데이터 구조를 요약하세요.
- goals는 정량 목표(시간 제약: D30, Q2 등 + 비교 연산자) 또는 정성 목표(UX, 유지보수성 등) 중 하나여야 합니다.
- api_endpoints의 POST/PUT/PATCH는 request_body 샘플 JSON을 포함해야 합니다.
- 모든 api_endpoints는 response 샘플 JSON과 error_codes(최소 3개)를 포함해야 합니다.
- scope.in_scope는 key_features 기반으로 생성하세요.
- scope.out_of_scope는 프로젝트 의도(why, summary)를 고려하여 명확히 범위 밖인 항목을 식별하세요.
- 반드시 유효한 JSON 한 개만 응답하세요.`;

// V3 생성 프롬프트 제거 (V4 사용)

export function makePRDCreatePromptV4(
  idea: string,
  previousErrors?: string[]
): string {
  const errorContext = previousErrors
    ? `\n\n이전 생성에서 발견된 오류들:\n${previousErrors.join('\n')}\n위 오류들을 수정하여 다시 생성해주세요.`
    : '';

  return `다음 아이디어를 바탕으로 의도 중심 PRD(PRD_V4)를 생성해주세요.
아이디어: ${idea}

요구사항:
- Why/Scope/Definition of Done(DoD)를 반드시 포함하세요.
- 수량 강제 조건(예: 최소 X개)은 금지합니다.
- SQL을 생성하지 말고 schema_summary로 데이터 구조를 요약하세요.
- goals는 정량 목표(시간 제약 포함: D30, Q2 등) 또는 정성 목표(UX, 유지보수성 등) 중 하나여야 합니다.
- api_endpoints의 POST/PUT/PATCH는 request_body 샘플 JSON을 포함해야 합니다.
- 모든 api_endpoints는 response 샘플 JSON과 error_codes(최소 3개)를 포함해야 합니다.

출력은 반드시 PRD_V4 JSON 스펙을 따르세요.
prompt_version은 "PRD_V4"이어야 합니다.${errorContext}`;
}

// V3 수정 프롬프트 제거 (V4 reviewer 사용)

export function makePRDReviewerPromptV4(
  base: unknown,
  issues: string[]
): string {
  return `아래 PRD를 자체 리뷰(self-critique)하고 PRD_V4 기준에 맞게 개선하세요.

기존 PRD(JSON):
${JSON.stringify(base, null, 2)}

발견된 이슈:
- ${issues.join('\n- ')}

개선 지침:
- Why/Scope/DoD 누락 또는 미흡 시 보완
- goals를 정량 목표(시간 제약 포함) 또는 정성 목표(UX, 유지보수성 등)로 정교화
- SQL 흔적 전면 제거 및 schema_summary로 전환/보강
- 의도 중심 설명으로 간결성/명확성 향상
- api_endpoints에 request_body/response 샘플 JSON과 error_codes 보완
- scope.in_scope는 key_features 기반으로 자동 생성, scope.out_of_scope는 명확히 식별
- prompt_version은 "PRD_V4"

반드시 유효한 PRD_V4 JSON 1개만 출력하세요.`;
}
