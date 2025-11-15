import type { Task } from '../core/types';

/**
 * Extract the first markdown H1 heading from PRD text
 * @param prdText - The markdown text to extract title from
 * @returns The extracted title (trimmed) or null if no heading found
 */
export function extractTitle(prdText: string): string | null {
  // Match first # heading (H1) in markdown
  const match = prdText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Format a preview string from tasks array
 *
 * Takes the first 3 tasks and formats them as: "id: title • id: title • id: title"
 *
 * @param tasks - Array of tasks to format
 * @returns Formatted preview string
 *
 * @example
 * formatTaskPreview([
 *   { id: 'T-001', title: 'Setup database', ... },
 *   { id: 'T-002', title: 'Create API', ... },
 *   { id: 'T-003', title: 'Build UI', ... },
 * ])
 * // Returns: "T-001: Setup database • T-002: Create API • T-003: Build UI"
 */
export function formatTaskPreview(tasks: Task[]): string {
  return tasks
    .slice(0, 3)
    .map((task) => `${task.id}: ${task.title}`)
    .join(' • ');
}
