/**
 * Mock Task Generator
 *
 * Purpose: Generate tasks from PRD text using deterministic regex-based parsing.
 * This implementation provides a consistent, testable alternative to AI-based
 * generation for development and testing purposes.
 *
 * Dependencies: core/types, core/validators
 * Usage: Imported by services/ai/index.ts factory
 */

import { TasksJsonSchema } from '../../core/validators/tasksSchema';

import type { Task, TaskGenerator, TasksJson, GeneratorOptions } from '../../core/types/tasks';

/**
 * MockTaskGenerator implements deterministic task generation from PRD text.
 *
 * Algorithm:
 * 1. Extract markdown sections using regex (## heading pattern)
 * 2. Identify key sections: Overview, Requirements, User Stories, Technical Details
 * 3. Parse bullet points and numbered lists from sections
 * 4. Generate 1-3 tasks per major section (targeting 5-20 tasks total)
 * 5. Create task IDs following T-001, T-002 pattern
 * 6. Generate task titles from section headings and content
 * 7. Extract tags from common keywords
 * 8. Create dependencies based on section order
 * 9. Convert bullet points to task steps
 * 10. Validate output with Zod schema
 *
 * Design Principles:
 * - Deterministic: Same input always produces same output
 * - No I/O operations: Pure function, no external dependencies
 * - Regex-based: No AI or external services required
 */
export class MockTaskGenerator implements TaskGenerator {
  /**
   * Generate tasks from a PRD document.
   *
   * @param prdText - The PRD content in markdown format
   * @param opts - Optional generation configuration
   * @returns Promise resolving to a validated TasksJson object
   */
  async generate(prdText: string, opts?: GeneratorOptions): Promise<TasksJson> {
    // Extract sections from markdown
    const sections = this.extractSections(prdText);

    // Generate tasks from sections
    const tasks = this.generateTasksFromSections(sections, opts?.maxTasks);

    // Build the TasksJson object
    const tasksJson: TasksJson = {
      version: '1.0',
      tasks,
    };

    // Validate with Zod schema
    const validated = TasksJsonSchema.parse(tasksJson);

    return validated;
  }

  /**
   * Extract markdown sections from PRD text.
   *
   * Identifies sections by ## headings and captures their content.
   * Returns a structured representation of sections with titles and content.
   *
   * @param prdText - The PRD markdown content
   * @returns Array of sections with title and content
   */
  private extractSections(prdText: string): Section[] {
    const sections: Section[] = [];

    // Match ## headings (level 2 headers)
    const headingRegex = /^##\s+(.+)$/gm;
    const matches = Array.from(prdText.matchAll(headingRegex));

    if (matches.length === 0) {
      // No sections found, treat entire text as one section
      return [{ title: 'Overview', content: prdText, order: 0 }];
    }

    // Extract content between headings
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const endIndex = matches[i + 1]?.index ?? prdText.length;
      const content = prdText.slice(startIndex, endIndex).trim();

      sections.push({
        title,
        content,
        order: i,
      });
    }

    return sections;
  }

  /**
   * Generate tasks from extracted sections.
   *
   * Creates 1-3 tasks per major section based on content complexity.
   * Ensures total task count is between 5 and 20 (or maxTasks if specified).
   *
   * @param sections - Extracted markdown sections
   * @param maxTasks - Optional maximum number of tasks to generate
   * @returns Array of generated tasks
   */
  private generateTasksFromSections(sections: Section[], maxTasks?: number): Task[] {
    const tasks: Task[] = [];
    const limit = maxTasks ?? 20;
    let taskCounter = 1;

    for (const section of sections) {
      // Stop if we've reached the limit
      if (tasks.length >= limit) {
        break;
      }

      // Determine how many tasks to generate for this section
      const tasksPerSection = this.calculateTasksPerSection(section, sections.length);

      // Generate tasks for this section
      for (let i = 0; i < tasksPerSection && tasks.length < limit; i++) {
        const task = this.generateTask(section, taskCounter, tasks);
        tasks.push(task);
        taskCounter++;
      }
    }

    // Ensure minimum of 1 task if we have content
    if (tasks.length === 0 && sections.length > 0) {
      tasks.push(this.generateTask(sections[0], 1, []));
    }

    return tasks;
  }

  /**
   * Calculate how many tasks to generate for a section.
   *
   * Rules:
   * - Sections with many bullet points generate more tasks (up to 3)
   * - Short sections generate fewer tasks (1)
   * - Adjust based on total section count to hit target range
   *
   * @param section - The section to analyze
   * @param totalSections - Total number of sections in PRD
   * @returns Number of tasks to generate (1-3)
   */
  private calculateTasksPerSection(section: Section, totalSections: number): number {
    const bulletPoints = this.extractBulletPoints(section.content);
    const contentLength = section.content.length;

    // More bullet points = more tasks
    if (bulletPoints.length >= 5) {
      return 3;
    }
    if (bulletPoints.length >= 3) {
      return 2;
    }

    // Longer content = more tasks
    if (contentLength > 500) {
      return 2;
    }

    // If we have few sections, generate more tasks per section
    if (totalSections <= 3) {
      return 2;
    }

    return 1;
  }

  /**
   * Generate a single task from a section.
   *
   * @param section - The section to generate from
   * @param taskNumber - The task number for ID generation
   * @param existingTasks - Previously generated tasks for dependency creation
   * @returns A complete Task object
   */
  private generateTask(section: Section, taskNumber: number, existingTasks: Task[]): Task {
    // Generate task ID (T-001, T-002, etc.)
    const id = `T-${taskNumber.toString().padStart(3, '0')}`;

    // Generate task title from section
    const title = this.generateTaskTitle(section, taskNumber, existingTasks.length);

    // Extract tags from content
    const tags = this.extractTags(section);

    // Generate dependencies based on section order
    const deps = this.generateDependencies(section, existingTasks);

    // Generate steps from bullet points
    const steps = this.generateSteps(section);

    return {
      id,
      title,
      tags,
      deps,
      steps,
    };
  }

  /**
   * Generate a task title from section content.
   *
   * Rules:
   * - Use section title as base
   * - Add distinguishing suffix for multiple tasks per section
   * - Ensure title is 3-140 characters
   *
   * @param section - The section to generate title from
   * @param taskNumber - The task number
   * @param existingCount - Number of existing tasks for uniqueness
   * @returns A valid task title
   */
  private generateTaskTitle(section: Section, taskNumber: number, existingCount: number): string {
    const baseTitle = section.title;

    // Check if multiple tasks are being generated from this section
    const suffix = existingCount > 0 && existingCount % 2 === 0 ? ' - Implementation' : '';

    let title = `${baseTitle}${suffix}`;

    // Ensure minimum length
    if (title.length < 3) {
      title = `Task: ${title}`;
    }

    // Ensure maximum length
    if (title.length > 140) {
      title = title.slice(0, 137) + '...';
    }

    return title;
  }

  /**
   * Extract tags from section content.
   *
   * Looks for common keywords that indicate task type:
   * - feature, implement, add, create -> feature
   * - fix, bug, issue, error -> bug
   * - update, improve, enhance, optimize -> enhancement
   * - test, testing, qa -> testing
   * - doc, documentation -> documentation
   * - refactor, cleanup, reorganize -> refactor
   *
   * @param section - The section to extract tags from
   * @returns Array of tags (max 8)
   */
  private extractTags(section: Section): string[] {
    const tags: string[] = [];
    const content = (section.title + ' ' + section.content).toLowerCase();

    // Feature indicators
    if (/\b(feature|implement|add|create|new)\b/.test(content)) {
      tags.push('feature');
    }

    // Bug indicators
    if (/\b(fix|bug|issue|error|defect)\b/.test(content)) {
      tags.push('bug');
    }

    // Enhancement indicators
    if (/\b(update|improve|enhance|optimize|upgrade)\b/.test(content)) {
      tags.push('enhancement');
    }

    // Testing indicators
    if (/\b(test|testing|qa|quality|coverage)\b/.test(content)) {
      tags.push('testing');
    }

    // Documentation indicators
    if (/\b(doc|documentation|readme|guide)\b/.test(content)) {
      tags.push('documentation');
    }

    // Refactor indicators
    if (/\b(refactor|cleanup|reorganize|restructure)\b/.test(content)) {
      tags.push('refactor');
    }

    // API indicators
    if (/\b(api|endpoint|route|rest)\b/.test(content)) {
      tags.push('api');
    }

    // UI indicators
    if (/\b(ui|interface|frontend|component|design)\b/.test(content)) {
      tags.push('ui');
    }

    // Remove duplicates and limit to 8
    return Array.from(new Set(tags)).slice(0, 8);
  }

  /**
   * Generate dependencies based on section order.
   *
   * Rules:
   * - Later sections may depend on earlier sections
   * - First task has no dependencies
   * - Every 3rd task may depend on a previous task
   * - Limit to 16 dependencies max
   *
   * @param section - The current section
   * @param existingTasks - Previously generated tasks
   * @returns Array of task IDs that this task depends on
   */
  private generateDependencies(section: Section, existingTasks: Task[]): string[] {
    const deps: string[] = [];

    // No dependencies for first task or first section
    if (section.order === 0 || existingTasks.length === 0) {
      return deps;
    }

    // Add dependency on previous task every 3rd task
    if (existingTasks.length % 3 === 0 && existingTasks.length > 0) {
      const prevTask = existingTasks[existingTasks.length - 1];
      deps.push(prevTask.id);
    }

    // For later sections, may depend on tasks from earlier sections
    if (section.order > 2 && existingTasks.length >= 2) {
      // Add dependency on second task (typically a foundational task)
      deps.push(existingTasks[1].id);
    }

    // Limit to 16 dependencies
    return deps.slice(0, 16);
  }

  /**
   * Generate steps from section content.
   *
   * Rules:
   * - Extract bullet points and numbered lists
   * - Convert each bullet/number to a step
   * - If no bullets found, generate generic steps
   * - Ensure 1-20 steps per task
   *
   * @param section - The section to generate steps from
   * @returns Array of step descriptions (1-20 steps)
   */
  private generateSteps(section: Section): string[] {
    const bulletPoints = this.extractBulletPoints(section.content);

    if (bulletPoints.length > 0) {
      // Use extracted bullet points as steps
      // Limit to 20 steps
      return bulletPoints.slice(0, 20);
    }

    // Generate generic steps if no bullet points found
    const steps: string[] = [
      `Review ${section.title} requirements`,
      `Design solution for ${section.title}`,
      `Implement ${section.title}`,
      `Test ${section.title} implementation`,
      `Document ${section.title} changes`,
    ];

    return steps;
  }

  /**
   * Extract bullet points and numbered lists from content.
   *
   * Matches:
   * - Unordered lists: -, *, +
   * - Ordered lists: 1., 2., etc.
   * - Nested lists (indented)
   *
   * @param content - The text content to parse
   * @returns Array of bullet point text (without markers)
   */
  private extractBulletPoints(content: string): string[] {
    const points: string[] = [];

    // Match unordered list items: - item, * item, + item
    const unorderedRegex = /^[\s]*[-*+]\s+(.+)$/gm;
    const unorderedMatches = Array.from(content.matchAll(unorderedRegex));
    points.push(...unorderedMatches.map(m => m[1].trim()));

    // Match ordered list items: 1. item, 2. item
    const orderedRegex = /^[\s]*\d+\.\s+(.+)$/gm;
    const orderedMatches = Array.from(content.matchAll(orderedRegex));
    points.push(...orderedMatches.map(m => m[1].trim()));

    // Remove duplicates and filter out empty strings
    return Array.from(new Set(points)).filter(p => p.length > 0);
  }
}

/**
 * Internal type for section representation.
 */
interface Section {
  title: string;
  content: string;
  order: number;
}
