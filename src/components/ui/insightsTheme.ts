// Insights Panel Visual Theme Constants
export const INSIGHTS_THEME = {
  // Section titles
  sectionTitle: 'text-xs uppercase tracking-wide font-medium text-neutral-600',

  // Cards
  card: 'p-3 rounded-2xl shadow-sm border border-neutral-100',
  cardCompact: 'p-2 rounded-xl shadow-sm border border-neutral-100',

  // Typography hierarchy
  subheading: 'text-sm font-medium text-neutral-900',
  body: 'text-sm text-neutral-700',
  small: 'text-xs text-neutral-500',

  // Chips and pills
  chip: 'text-xs font-medium rounded-full px-2 py-0.5',
  chipUX: 'bg-blue-100 text-blue-700',
  chipTech: 'bg-green-100 text-green-700',
  chipRisk: 'bg-orange-100 text-orange-700',
  chipData: 'bg-orange-100 text-orange-700',
  chipPerf: 'bg-orange-100 text-orange-700',

  // Priority/Risk pills
  priorityHigh: 'bg-red-100 text-red-700',
  priorityMedium: 'bg-yellow-100 text-yellow-700',
  priorityLow: 'bg-green-100 text-green-700',

  riskHigh: 'bg-red-100 text-red-700',
  riskMedium: 'bg-yellow-100 text-yellow-700',
  riskLow: 'bg-green-100 text-green-700',

  // Icons
  iconSize: 'h-6 w-6',
  iconSizeSmall: 'h-4 w-4',

  // Transitions
  transition: 'transition-all duration-150 ease-in-out',

  // Empty states
  emptyState: 'text-xs text-neutral-400 italic',

  // Spacing
  sectionSpacing: 'space-y-2',
  cardSpacing: 'space-y-2',
} as const;

export const IMPACT_COLORS = {
  UX: INSIGHTS_THEME.chipUX,
  Tech: INSIGHTS_THEME.chipTech,
  Risk: INSIGHTS_THEME.chipRisk,
  Data: INSIGHTS_THEME.chipData,
  Perf: INSIGHTS_THEME.chipPerf,
} as const;
