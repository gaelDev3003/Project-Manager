/**
 * Scope 전용 reviewer 프롬프트
 * - key_features 기반으로 in_scope 자동 생성
 * - out_of_scope는 LLM self-critique로 추가
 */

export function makeScopeReviewerPrompt(
  base: unknown,
  keyFeatures: Array<{ name: string; notes?: string }>
): string {
  return `아래 PRD의 Scope를 검토하고 개선하세요.

기존 PRD(JSON):
${JSON.stringify(base, null, 2)}

현재 key_features:
${JSON.stringify(keyFeatures, null, 2)}

지침:
1. **in_scope 자동 생성**: 위 key_features 목록을 기반으로 "in_scope" 배열을 생성하세요.
   - 각 feature의 "name"을 in_scope 항목으로 추가합니다.
   - 예: key_features에 "코딩 실습", "동영상 강의"가 있으면 → in_scope: ["코딩 실습 기능", "동영상 강의 제공"]

2. **out_of_scope 추론**: 프로젝트의 의도(why, summary)를 고려하여 명백히 범위 밖인 기능이나 요구사항을 식별하세요.
   - 예: MVP가 아닌 경우 → ["프리미엄 구독", "다국어 지원", "모바일 앱"]
   - 예: 온라인 플랫폼인 경우 → ["오프라인 이벤트", "인쇄물 배포"]

3. **일관성 확인**: in_scope와 out_of_scope 간 중복이 없도록 하세요.

반환해야 할 형식:
{
  "scope": {
    "in_scope": ["기능1", "기능2", ...],
    "out_of_scope": ["제외 항목1", "제외 항목2", ...]
  }
}

반드시 유효한 JSON 1개만 출력하세요.`;
}

export function makeScopeIssuesPrompt(base: unknown, issues: string[]): string {
  return `아래 PRD의 Scope 관련 이슈를 해결하세요.

기존 PRD(JSON):
${JSON.stringify(base, null, 2)}

발견된 Scope 이슈:
- ${issues.join('\n- ')}

지침:
- in_scope와 out_of_scope 간 중복을 제거하세요.
- key_features와 일관성을 유지하세요.
- 명확하고 구체적인 항목으로 작성하세요.

반환 형식:
{
  "scope": {
    "in_scope": ["수정된 범위 내 항목들"],
    "out_of_scope": ["수정된 범위 밖 항목들"]
  }
}

반드시 유효한 JSON 1개만 출력하세요.`;
}

