/**
 * API 계약 전용 reviewer 프롬프트
 * - 각 endpoint에 샘플 request/response JSON 자동 포함
 * - 구조화된 필드 강화
 */

export function makeAPIReviewerPrompt(
  base: unknown,
  entities?: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
    description?: string;
    relationships?: string[];
  }>
): string {
  return `아래 PRD의 API endpoints를 검토하고 구조화된 계약(contract)으로 강화하세요.

기존 PRD(JSON):
${JSON.stringify(base, null, 2)}

${
  entities && entities.length > 0
    ? `Schema Entities:
${JSON.stringify(entities, null, 2)}
`
    : ''
}

지침:
1. **request_body 샘플 JSON 추가**: 각 POST/PUT/PATCH endpoint에 실제 사용 가능한 샘플 JSON을 포함하세요.
   - 예: { "name": "새 프로젝트", "description": "설명", "tags": ["tag1", "tag2"] }

2. **response 샘플 JSON 추가**: 각 endpoint의 성공 응답 예시를 포함하세요.
   - GET: 조회된 데이터 구조
   - POST: 생성된 리소스 (id 포함)
   - PUT/PATCH: 업데이트된 리소스

3. **error_codes 확장**: 일반적인 에러 코드 (400, 401, 403, 404, 500 등)와 설명을 추가하세요.
   - 예: { "400": "잘못된 요청 데이터", "401": "인증 필요", "404": "리소스 없음" }

4. **rate_limit 추가** (선택): API 성능을 고려하여 rate limit 정보를 포함하세요.

반환해야 할 형식:
{
  "api_endpoints": [
    {
      "method": "POST",
      "path": "/api/projects",
      "description": "새 프로젝트 생성",
      "auth_required": true,
      "request_body": {
        "name": "새 프로젝트",
        "description": "프로젝트 설명",
        "tags": ["tag1"]
      },
      "response": {
        "id": "uuid-string",
        "name": "새 프로젝트",
        "created_at": "2025-10-29T12:00:00Z"
      },
      "error_codes": {
        "400": "잘못된 요청 데이터",
        "401": "인증 필요",
        "500": "서버 내부 오류"
      },
      "rate_limit": {
        "requests_per_minute": 60
      }
    }
  ]
}

반드시 유효한 JSON 1개만 출력하세요.`;
}

export function makeAPIIssuesPrompt(base: unknown, issues: string[]): string {
  return `아래 PRD의 API endpoints 관련 이슈를 해결하세요.

기존 PRD(JSON):
${JSON.stringify(base, null, 2)}

발견된 API 이슈:
- ${issues.join('\n- ')}

지침:
- request_body와 response 샘플 JSON을 누락된 경우 추가하세요.
- error_codes를 확장하여 일반적인 에러 상황을 포함하세요.
- auth_required가 올바르게 설정되었는지 확인하세요.

반환 형식:
{
  "api_endpoints": [
    {
      "method": "...",
      "path": "...",
      "description": "...",
      "auth_required": true/false,
      "request_body": { ... },
      "response": { ... },
      "error_codes": { ... }
    }
  ]
}

반드시 유효한 JSON 1개만 출력하세요.`;
}
