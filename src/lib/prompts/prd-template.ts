// PRD_V3 - 중앙화된 프롬프트 시스템
// 품질 규칙: API ≥5, Data 스키마(관계형/비관계형), Features 5-7개, NFRs 포함

export const PRD_SYSTEM_PROMPT_V3 = `당신은 경험 많은 프로덕트 매니저입니다. 주어진 아이디어를 바탕으로 체계적이고 실용적인 PRD를 작성합니다.

**품질 기준 (PRD_V3):**
1. **API 엔드포인트**: 최소 5개 이상, 각각 method/path/description/request_body/response/auth_required/error_codes(400/401/403/404/409/422/429/500 중 3개 이상) 포함
2. **데이터 스키마**: 관계형(실행 가능한 SQL+인덱스+FK+NOT NULL/DEFAULT+권한 정책) 또는 비관계형(컬렉션 모델+인덱스+보안 규칙) 중 하나는 반드시 존재
3. **기능**: 5-7개, {name, priority, risk, effort, impacts, tags, dependencies, notes} + 구현 힌트 포함
4. **구현 단계**: 8시간 단위, 각 Phase ≥3 acceptance_criteria
5. **NFRs**: 성능/P95, 가용성, 보안, 프라이버시, 관측성, 접근성, i18n 섹션 포함
6. **JSON만 응답**: 단일 객체, 파싱 가능

**출력 형식:**
{
  "summary": "프로젝트 한 줄 요약",
  "goals": ["측정 가능한 목표 3개"],
  "key_features": [
    {
      "name": "기능명",
      "priority": "high|medium|low",
      "risk": "high|medium|low",
      "effort": "high|medium|low",
      "impacts": ["영향받는 사용자/시스템"],
      "tags": ["태그1", "태그2"],
      "dependencies": ["의존성 기능들"],
      "notes": "구현 힌트 및 세부사항"
    }
  ],
  "technical_stack": {
    "frontend": ["구체적인 기술 스택"],
    "backend": ["구체적인 기술 스택"],
    "database": ["데이터베이스 기술"],
    "auth": ["인증 기술"],
    "deployment": ["배포 기술"]
  },
  "database_schema": {
    "type": "relational|non_relational",
    "relational": {
      "tables": [
        {
          "name": "테이블명",
          "sql": "CREATE TABLE ...",
          "indexes": ["CREATE INDEX ..."],
          "rls_policy": "CREATE POLICY ..."
        }
      ]
    },
    "non_relational": {
      "collections": [
        {
          "name": "컬렉션명",
          "document_example": {},
          "indexes": ["인덱스 정의"],
          "rules": ["보안 규칙"]
        }
      ]
    }
  },
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/...",
      "description": "엔드포인트 설명",
      "auth_required": true,
      "request_body": {},
      "response": {},
      "error_codes": ["400", "401", "403", "404", "500"]
    }
  ],
  "implementation_phases": [
    {
      "phase": "Phase 0",
      "title": "제목",
      "tasks": ["구체적인 작업 1", "구체적인 작업 2"],
      "estimated_hours": 8,
      "acceptance_criteria": ["기준1", "기준2", "기준3"]
    }
  ],
  "nfrs": {
    "performance": {
      "p95_latency_ms": 200,
      "throughput_rps": 1000
    },
    "availability": "99.9%",
    "security": ["보안 요구사항"],
    "privacy": ["개인정보 보호 요구사항"],
    "observability": ["모니터링 요구사항"],
    "accessibility": ["접근성 요구사항"],
    "i18n": ["국제화 요구사항"]
  },
  "environment_variables": [
    {
      "key": "환경변수명",
      "description": "설명",
      "required": true
    }
  ],
  "out_of_scope": ["제외 항목들"],
  "risks": [
    {
      "risk": "위험 요소",
      "mitigation": "완화 전략"
    }
  ],
  "acceptance_criteria": ["구체적이고 테스트 가능한 기준"],
  "prompt_version": "PRD_V3"
}

**CRITICAL: RESPOND ONLY WITH VALID JSON - NO OTHER TEXT OR MARKDOWN**
**The response must be a single JSON object that can be parsed directly**`;

export function makePRDCreatePrompt(
  idea: string,
  previousErrors?: string[]
): string {
  const errorContext = previousErrors
    ? `\n\n이전 생성에서 발견된 오류들:\n${previousErrors.join('\n')}\n위 오류들을 수정하여 다시 생성해주세요.`
    : '';

  return `다음 아이디어를 바탕으로 상세한 PRD(Product Requirements Document)를 생성해주세요.
아이디어: ${idea}

**중요한 요구사항:**
1. **API 엔드포인트**: 최소 5개 이상, 각각 method/path/description/request_body/response/auth_required/error_codes(400/401/403/404/409/422/429/500 중 3개 이상) 포함
2. **데이터 스키마**: 관계형(실행 가능한 SQL+인덱스+FK+NOT NULL/DEFAULT+권한 정책) 또는 비관계형(컬렉션 모델+인덱스+보안 규칙) 중 하나는 반드시 존재
3. **기능**: 5-7개, {name, priority, risk, effort, impacts, tags, dependencies, notes} + 구현 힌트 포함
4. **구현 단계**: 8시간 단위, 각 Phase ≥3 acceptance_criteria
5. **NFRs**: 성능/P95, 가용성, 보안, 프라이버시, 관측성, 접근성, i18n 섹션 포함
6. **기술 스택**: frontend, backend, database, auth, deployment 구체적으로 명시
7. **환경 변수**: 필요한 환경 변수들과 설명 포함
8. **리스크 관리**: 위험 요소와 완화 전략 포함

**출력 형식 (정확히 이 구조를 따라주세요):**
{
  "summary": "프로젝트 한 줄 요약",
  "goals": ["측정 가능한 목표 3개"],
  "key_features": [
    {
      "name": "기능명",
      "priority": "high|medium|low",
      "risk": "high|medium|low", 
      "effort": "high|medium|low",
      "impacts": ["영향받는 사용자/시스템"],
      "tags": ["태그1", "태그2"],
      "dependencies": ["의존성 기능들"],
      "notes": "구현 힌트 및 세부사항"
    }
  ],
  "technical_stack": {
    "frontend": ["구체적인 기술 스택"],
    "backend": ["구체적인 기술 스택"],
    "database": ["데이터베이스 기술"],
    "auth": ["인증 기술"],
    "deployment": ["배포 기술"]
  },
  "database_schema": {
    "type": "relational",
    "relational": {
      "tables": [
        {
          "name": "테이블명",
          "sql": "CREATE TABLE ...",
          "indexes": ["CREATE INDEX ..."],
          "rls_policy": "CREATE POLICY ..."
        }
      ]
    }
  },
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/...",
      "description": "엔드포인트 설명",
      "auth_required": true,
      "request_body": {},
      "response": {},
      "error_codes": ["400", "401", "403", "404", "500"]
    }
  ],
  "implementation_phases": [
    {
      "phase": "Phase 0",
      "title": "제목",
      "tasks": ["구체적인 작업 1", "구체적인 작업 2"],
      "estimated_hours": 8,
      "acceptance_criteria": ["기준1", "기준2", "기준3"]
    }
  ],
  "nfrs": {
    "performance": {
      "p95_latency_ms": 200,
      "throughput_rps": 1000
    },
    "availability": "99.9%",
    "security": ["보안 요구사항"],
    "privacy": ["개인정보 보호 요구사항"],
    "observability": ["모니터링 요구사항"],
    "accessibility": ["접근성 요구사항"],
    "i18n": ["국제화 요구사항"]
  },
  "environment_variables": [
    {
      "key": "환경변수명",
      "description": "설명",
      "required": true
    }
  ],
  "out_of_scope": ["제외 항목들"],
  "risks": [
    {
      "risk": "위험 요소",
      "mitigation": "완화 전략"
    }
  ],
  "acceptance_criteria": ["구체적이고 테스트 가능한 기준"],
  "prompt_version": "PRD_V3"
}

구체적이고 실행 가능하게 작성하세요.${errorContext}`;
}

export function makePRDRevisePrompt(
  base: unknown,
  feedbackText: string
): string {
  return `기존 PRD를 사용자 피드백에 따라 수정해주세요.

**기존 PRD 요약:**
${JSON.stringify(base, null, 2)}

**사용자 피드백:**
${feedbackText}

**수정 요구사항:**
1. 피드백을 반영하여 PRD_V3 구조로 완전히 재생성
2. API 엔드포인트, 데이터 스키마, NFRs를 모두 포함
3. features 배열에 모든 기능을 구조화하여 포함
4. implementation_phases에 구체적인 단계별 계획 포함
5. prompt_version: "PRD_V3" 유지

**출력 형식 (PRD_V3 구조):**
{
  "summary": "프로젝트 한 줄 요약",
  "goals": ["측정 가능한 목표 3개"],
  "key_features": [
    {
      "name": "기능명",
      "priority": "high|medium|low",
      "risk": "high|medium|low",
      "effort": "high|medium|low",
      "impacts": ["영향받는 사용자/시스템"],
      "tags": ["태그1", "태그2"],
      "dependencies": ["의존성 기능들"],
      "notes": "구현 힌트 및 세부사항"
    }
  ],
  "technical_stack": {
    "frontend": ["구체적인 기술 스택"],
    "backend": ["구체적인 기술 스택"],
    "database": ["데이터베이스 기술"],
    "auth": ["인증 기술"],
    "deployment": ["배포 기술"]
  },
  "database_schema": {
    "type": "relational|non_relational",
    "relational": {
      "tables": [
        {
          "name": "테이블명",
          "sql": "CREATE TABLE ...",
          "indexes": ["CREATE INDEX ..."],
          "rls_policy": "CREATE POLICY ..."
        }
      ]
    }
  },
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/...",
      "description": "엔드포인트 설명",
      "auth_required": true,
      "request_body": {},
      "response": {},
      "error_codes": ["400", "401", "403", "404", "500"]
    }
  ],
  "implementation_phases": [
    {
      "phase": "Phase 0",
      "title": "제목",
      "tasks": ["구체적인 작업 1", "구체적인 작업 2"],
      "estimated_hours": 8,
      "acceptance_criteria": ["기준1", "기준2", "기준3"]
    }
  ],
  "nfrs": {
    "performance": {
      "p95_latency_ms": 200,
      "throughput_rps": 1000
    },
    "availability": "99.9%",
    "security": ["보안 요구사항"],
    "privacy": ["개인정보 보호 요구사항"],
    "observability": ["모니터링 요구사항"],
    "accessibility": ["접근성 요구사항"],
    "i18n": ["국제화 요구사항"]
  },
  "environment_variables": [
    {
      "key": "환경변수명",
      "description": "설명",
      "required": true
    }
  ],
  "out_of_scope": ["제외 항목들"],
  "risks": [
    {
      "risk": "위험 요소",
      "mitigation": "완화 전략"
    }
  ],
  "acceptance_criteria": ["구체적이고 테스트 가능한 기준"],
  "prompt_version": "PRD_V3"
}

**CRITICAL: RESPOND ONLY WITH VALID JSON - NO OTHER TEXT OR MARKDOWN**
**The response must be a single JSON object that can be parsed directly**`;
}
