export type InsightViewModel = {
  coreFocus: string;
  keyRisks: string[];
  successMetrics: string[];
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    text: string;
    impacts: string[];
  }>;
  priority: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies: string[];
  scenarios: string[];
  previewMd: string;
  features: Array<{
    id: string;
    name: string;
    priority: 'high' | 'medium' | 'low';
    risk: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    impacts: string[];
    dependencies: string[];
    notes?: string;
    tags?: string[];
  }>;
};

export const IMPACT_TAGS = ['UX', 'Tech', 'Perf', 'Data', 'Risk'] as const;
export type ImpactTag = (typeof IMPACT_TAGS)[number];

export const PRIORITY_COLORS = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
} as const;

export const TYPE_COLORS = {
  added: 'bg-green-500/10 text-green-500 border-green-500/20',
  modified: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  removed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
} as const;

export const IMPACT_COLORS = {
  UX: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Tech: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Perf: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Data: 'bg-green-500/10 text-green-500 border-green-500/20',
  Risk: 'bg-red-500/10 text-red-500 border-red-500/20',
} as const;

export function mapToInsightViewModel(
  selectedVersion: {
    id: string;
    title?: string;
    content_md?: string | null;
    summary_json?: any;
    created_at?: string | null;
  } | null
): InsightViewModel {
  if (!selectedVersion?.summary_json) {
    return getDefaultInsightViewModel();
  }

  const summary = selectedVersion.summary_json;

  // Core Focus - 1-2 lines from goal or summary
  const coreFocus = extractCoreFocus(summary);

  // Key Risks - top 1-2, or "None noted"
  const keyRisks = extractKeyRisks(summary);

  // Success Metrics - top 3, short
  const successMetrics = extractSuccessMetrics(summary);

  // Changes with impact tags
  const changes = extractChanges(summary);

  // Priority, Risk, Effort
  const priority = normalizePriority(summary.priority);
  const risk = normalizeRisk(summary.risk);
  const effort = normalizeEffort(summary.effort);

  // Dependencies
  const dependencies = Array.isArray(summary.dependencies)
    ? summary.dependencies
    : [];

  // Scenarios - Workflow에서 추출
  const scenarios = extractWorkflow(summary);

  // Preview MD - first 5 lines
  const previewMd = extractPreviewMd(selectedVersion.content_md);

  // Features - multi-feature aware
  const features = extractFeatures(summary);

  return {
    coreFocus,
    keyRisks,
    successMetrics,
    changes,
    priority,
    risk,
    effort,
    dependencies,
    scenarios,
    previewMd,
    features,
  };
}

function getDefaultInsightViewModel(): InsightViewModel {
  return {
    coreFocus: '프로젝트 목표가 설정되지 않았습니다.',
    keyRisks: ['None noted'],
    successMetrics: ['메트릭이 설정되지 않았습니다.'],
    changes: [],
    priority: 'medium',
    risk: 'low',
    effort: 'medium',
    dependencies: [],
    scenarios: [],
    previewMd: '',
    features: [],
  };
}

function extractCoreFocus(summary: any): string {
  // PRD_V3 구조 지원: goals 배열에서 모든 목표를 요약
  if (
    summary.goals &&
    Array.isArray(summary.goals) &&
    summary.goals.length > 0
  ) {
    // 모든 목표를 하나의 문자열로 결합
    const allGoals = summary.goals.join(', ');
    return allGoals.substring(0, 200);
  }

  // 기존 구조 지원
  const goal =
    summary.goal ||
    summary.sections?.find((s: any) => s.title === 'Goal')?.content ||
    summary.problemSolution ||
    summary.sections?.find((s: any) => s.title === 'Problem Statement')
      ?.content;

  if (goal && typeof goal === 'string') {
    const lines = goal.split('\n').filter((line: string) => line.trim());
    return lines.slice(0, 2).join(' ').substring(0, 200);
  }

  return '프로젝트 목표가 설정되지 않았습니다.';
}

function extractKeyRisks(summary: any): string[] {
  const risks = summary.risks || summary.keyRisks || [];

  if (Array.isArray(risks) && risks.length > 0) {
    return risks.slice(0, 2).map((risk: any) => {
      // 객체인 경우 처리
      if (typeof risk === 'object' && risk !== null) {
        return (
          risk.risk ||
          risk.description ||
          risk.text ||
          risk.name ||
          String(risk)
        );
      }
      return typeof risk === 'string'
        ? risk.substring(0, 100)
        : String(risk).substring(0, 100);
    });
  }

  return ['None noted'];
}

function extractSuccessMetrics(summary: any): string[] {
  // PRD_V3 구조 지원: acceptance_criteria에서 메트릭 추출
  if (
    summary.acceptance_criteria &&
    Array.isArray(summary.acceptance_criteria) &&
    summary.acceptance_criteria.length > 0
  ) {
    return summary.acceptance_criteria
      .slice(0, 3)
      .map((criteria: any) =>
        typeof criteria === 'string'
          ? criteria.substring(0, 80)
          : String(criteria).substring(0, 80)
      );
  }

  // 기존 구조 지원
  const metrics =
    summary.kpi || summary.successMetrics || summary.metrics || [];

  if (Array.isArray(metrics) && metrics.length > 0) {
    return metrics
      .slice(0, 3)
      .map((metric: any) =>
        typeof metric === 'string'
          ? metric.substring(0, 80)
          : String(metric).substring(0, 80)
      );
  }

  return ['메트릭이 설정되지 않았습니다.'];
}

function extractWorkflow(summary: any): string[] {
  // PRD_V3 구조에서 implementation_phases 추출
  if (
    summary.implementation_phases &&
    Array.isArray(summary.implementation_phases)
  ) {
    return summary.implementation_phases.map((phase: any) => {
      if (typeof phase === 'object' && phase !== null) {
        return `${phase.title || phase.phase}: ${phase.tasks?.join(', ') || ''}`;
      }
      return String(phase);
    });
  }

  // 기존 구조 지원
  const workflow = summary.workflow || summary.scenarios || [];

  if (Array.isArray(workflow) && workflow.length > 0) {
    return workflow.map((item: any) =>
      typeof item === 'string'
        ? item.substring(0, 100)
        : String(item).substring(0, 100)
    );
  }

  return ['워크플로우가 정의되지 않았습니다.'];
}

function extractChanges(summary: any): Array<{
  type: 'added' | 'modified' | 'removed';
  text: string;
  impacts: string[];
}> {
  // PRD_V3 구조에서 key_features의 변경사항 추출
  if (summary.key_features && Array.isArray(summary.key_features)) {
    // v1과 v2를 구분하기 위해 기능 개수에 따라 다른 표시
    const featureCount = summary.key_features.length;

    if (featureCount === 5) {
      // v1: 기본 5개 기능을 'added'로 표시
      return summary.key_features.map((feature: any) => ({
        type: 'added' as const,
        text: `${feature.name}: ${feature.notes || feature.description || ''}`,
        impacts: extractImpactsFromChange(feature),
      }));
    } else if (featureCount === 7) {
      // v2: 새로 추가된 2개 기능만 'added'로 표시
      const newFeatures = summary.key_features.slice(5); // 마지막 2개가 새로 추가된 기능
      return newFeatures.map((feature: any) => ({
        type: 'added' as const,
        text: `${feature.name}: ${feature.notes || feature.description || ''}`,
        impacts: extractImpactsFromChange(feature),
      }));
    } else {
      // 기타 경우: 모든 기능을 표시
      return summary.key_features.slice(0, 5).map((feature: any) => ({
        type: 'added' as const,
        text: `${feature.name}: ${feature.notes || feature.description || ''}`,
        impacts: extractImpactsFromChange(feature),
      }));
    }
  }

  // 기존 구조 지원
  const changes = summary.changes || [];

  if (!Array.isArray(changes)) return [];

  // Return all changes without filtering to show all changes in the Changes section
  return changes.map((change: any) => ({
    type: normalizeChangeType(change.type),
    text: (change.description || change.text || '변경사항').substring(0, 150),
    impacts: extractImpactsFromChange(change),
  }));
}

function extractImpactsFromChange(change: any): string[] {
  const impacts: string[] = [];

  // Try to extract from change text or description
  const text = (change.description || change.text || '').toLowerCase();

  if (text.includes('ui') || text.includes('ux') || text.includes('user')) {
    impacts.push('UX');
  }
  if (
    text.includes('tech') ||
    text.includes('technical') ||
    text.includes('api')
  ) {
    impacts.push('Tech');
  }
  if (
    text.includes('perf') ||
    text.includes('performance') ||
    text.includes('speed')
  ) {
    impacts.push('Perf');
  }
  if (
    text.includes('data') ||
    text.includes('database') ||
    text.includes('storage')
  ) {
    impacts.push('Data');
  }
  if (
    text.includes('risk') ||
    text.includes('security') ||
    text.includes('vulnerability')
  ) {
    impacts.push('Risk');
  }

  // If no impacts detected, default to UX
  if (impacts.length === 0) {
    impacts.push('UX');
  }

  return impacts;
}

function extractPreviewMd(contentMd: string | null | undefined): string {
  if (!contentMd) return '';

  const lines = contentMd.split('\n').filter((line) => line.trim());
  return lines.slice(0, 5).join('\n');
}

function extractFeatures(summary: any): Array<{
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impacts: string[];
  dependencies: string[];
  notes?: string;
  tags?: string[];
}> {
  const features = summary.features || summary.key_features || [];

  if (!Array.isArray(features)) return [];

  return features.map((feature: any, index: number) => {
    const name =
      typeof feature === 'string'
        ? feature
        : feature.name || feature.title || `Feature ${index + 1}`;

    return {
      id: `feature-${index}`,
      name: name.substring(0, 100),
      priority: normalizePriority(feature.priority),
      risk: normalizeRisk(feature.risk),
      effort: normalizeEffort(feature.effort),
      impacts: extractImpactsFromChange(feature),
      dependencies: Array.isArray(feature.dependencies)
        ? feature.dependencies
        : [],
      notes: feature.notes || feature.description,
      tags: feature.tags || [],
    };
  });
}

function normalizeChangeType(type: any): 'added' | 'modified' | 'removed' {
  if (typeof type !== 'string') return 'modified';

  const normalized = type.toLowerCase();
  if (normalized.includes('add') || normalized === 'new') return 'added';
  if (normalized.includes('remove') || normalized.includes('delete'))
    return 'removed';
  return 'modified';
}

function normalizePriority(priority: any): 'high' | 'medium' | 'low' {
  if (typeof priority !== 'string') return 'medium';

  const normalized = priority.toLowerCase();
  if (
    normalized.includes('high') ||
    normalized.includes('urgent') ||
    normalized.includes('critical')
  )
    return 'high';
  if (normalized.includes('low') || normalized.includes('minor')) return 'low';
  return 'medium';
}

function normalizeRisk(risk: any): 'high' | 'medium' | 'low' {
  if (typeof risk !== 'string') return 'low';

  const normalized = risk.toLowerCase();
  if (
    normalized.includes('high') ||
    normalized.includes('critical') ||
    normalized.includes('severe')
  )
    return 'high';
  if (normalized.includes('low') || normalized.includes('minimal'))
    return 'low';
  return 'medium';
}

function normalizeEffort(effort: any): 'low' | 'medium' | 'high' {
  if (typeof effort !== 'string') return 'medium';

  const normalized = effort.toLowerCase();
  if (
    normalized.includes('high') ||
    normalized.includes('large') ||
    normalized.includes('extensive')
  )
    return 'high';
  if (
    normalized.includes('low') ||
    normalized.includes('small') ||
    normalized.includes('minimal')
  )
    return 'low';
  return 'medium';
}
