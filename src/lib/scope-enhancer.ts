/**
 * Scope 자동 생성 및 강화 로직
 * - key_features 기반으로 in_scope 자동 채우기
 * - out_of_scope는 LLM self-critique 결과로 추가
 */

import { PRDV4 } from './prd-schema';

/**
 * key_features에서 in_scope 자동 추출
 */
export function generateInScopeFromFeatures(prd: PRDV4): string[] {
  if (!prd.key_features || prd.key_features.length === 0) {
    return [];
  }

  return prd.key_features.map((feature) => {
    // feature.name 또는 feature.notes에서 기능명 추출
    return feature.name || feature.notes || '알 수 없음';
  });
}

/**
 * Scope 자동 완성: key_features 기반으로 in_scope 채우기
 */
export function autoFillScope(prd: PRDV4): PRDV4 {
  const updated = { ...prd };

  // in_scope가 비어있으면 key_features에서 자동 생성
  if (!updated.scope.in_scope || updated.scope.in_scope.length === 0) {
    updated.scope.in_scope = generateInScopeFromFeatures(prd);
  }

  // out_of_scope는 기본값으로 빈 배열 유지 (LLM self-critique로 채워짐)
  if (!updated.scope.out_of_scope) {
    updated.scope.out_of_scope = [];
  }

  return updated;
}

/**
 * Scope 검증: in_scope와 out_of_scope 간 중복 확인
 */
export function validateScope(prd: PRDV4): string[] {
  const issues: string[] = [];

  if (!prd.scope) {
    issues.push('scope 필드가 존재하지 않습니다.');
    return issues;
  }

  const inScope = prd.scope.in_scope || [];
  const outOfScope = prd.scope.out_of_scope || [];

  // 중복 확인
  const duplicates = inScope.filter((item) =>
    outOfScope.some(
      (out) =>
        out.toLowerCase().includes(item.toLowerCase()) ||
        item.toLowerCase().includes(out.toLowerCase())
    )
  );

  if (duplicates.length > 0) {
    issues.push(
      `scope 중복: 다음 항목이 in_scope와 out_of_scope 모두에 포함되어 있습니다: ${duplicates.join(', ')}`
    );
  }

  // in_scope 비어있는 경우 경고
  if (inScope.length === 0 && prd.key_features && prd.key_features.length > 0) {
    issues.push(
      'in_scope가 비어있습니다. key_features에서 자동으로 채울 수 있습니다.'
    );
  }

  return issues;
}

