/**
 * Core Task Domain Types
 *
 * Purpose: Define the fundamental types and interfaces for the task domain.
 * These types represent the core business entities and contracts that all
 * other layers depend on.
 *
 * Dependencies: None - this is pure domain modeling
 * Usage: Imported by validators, services, and features
 */

/**
 * Priority levels for tasks.
 * P0: Critical/Bootstrap (repo setup, CI/CD, schema migration)
 * P1: High priority (core features, critical path)
 * P2: Medium priority (supporting features)
 * P3: Low priority (nice-to-have, cosmetic)
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Risk levels for tasks.
 */
export type Risk = 'low' | 'medium' | 'high';

/**
 * Role classifications for tasks.
 */
export type Role = 'frontend' | 'backend' | 'infra' | 'qa' | 'pm';

/**
 * Task status types.
 */
export type TaskStatus = 'planned' | 'in-progress' | 'completed';

/**
 * Task metadata containing priority, risk, effort, and role information.
 *
 * @property priority - Task priority level (P0-P3)
 * @property risk - Implementation risk level
 * @property effort_hours - Estimated effort in hours (2-24 hours)
 * @property role - Primary role responsible for the task
 * @property status - Current status of the task
 * @property created - ISO 8601 timestamp when task was created
 * @property updated - ISO 8601 timestamp when task was last updated
 */
export interface TaskMetadata {
  priority: Priority;
  risk: Risk;
  effort_hours: number;
  role: Role;
  status: TaskStatus;
  created: string;
  updated: string;
}

/**
 * Represents a single task in the system.
 *
 * @property id - Unique task identifier following pattern: [A-Z]-\d{3} (e.g., T-001, A-042)
 * @property title - Short description of the task (3-140 characters)
 * @property description - One-sentence functional goal (optional)
 * @property details - Short implementation plan (optional)
 * @property testStrategy - Specific verification approach (optional)
 * @property tags - Categorization labels for the task (max 8 tags, must include role:* and domain:*)
 * @property deps - Task IDs that this task depends on (max 16 dependencies)
 * @property steps - Ordered list of steps to complete the task (1-20 steps, each non-empty)
 * @property metadata - Task metadata with priority, risk, effort, role, and status (optional)
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  details?: string;
  testStrategy?: string;
  tags: string[];
  deps: string[];
  steps: string[];
  metadata?: TaskMetadata;
}

/**
 * Version information for the tasks.json file.
 *
 * @property schema - Schema version (e.g., "1.0")
 * @property generator - Generator version (e.g., "v3")
 * @property source_prd - Path to the source PRD file (optional)
 */
export interface VersionInfo {
  schema: string;
  generator: string;
  source_prd?: string;
}

/**
 * Represents the complete tasks.json file structure.
 *
 * @property version - Version information (string for backward compatibility, or VersionInfo object)
 * @property tasks - Array of Task objects (1-200 tasks)
 */
export interface TasksJson {
  version: string | VersionInfo;
  tasks: Task[];
}

/**
 * Configuration options for task generation.
 *
 * @property maxTasks - Maximum number of tasks to generate (optional)
 * @property model - AI model to use for generation (optional)
 * @property temperature - Creativity parameter for AI generation (optional, 0-1)
 */
export interface GeneratorOptions {
  maxTasks?: number;
  model?: string;
  temperature?: number;
}

/**
 * Interface for task generation implementations.
 *
 * This abstraction allows for multiple generation strategies:
 * - Mock generator (regex-based parsing)
 * - AI generator (LLM-based generation)
 * - Hybrid approaches
 */
export interface TaskGenerator {
  /**
   * Generate tasks from a PRD (Product Requirements Document).
   *
   * @param prdText - The PRD content in markdown format
   * @param opts - Optional generation configuration
   * @returns Promise resolving to a validated TasksJson object
   */
  generate(prdText: string, opts?: GeneratorOptions): Promise<TasksJson>;
}

/**
 * Interface for building prompts for AI-based generation.
 *
 * This abstraction separates prompt construction from the generation logic,
 * allowing for easier testing and prompt optimization.
 */
export interface PromptBuilder {
  /**
   * Build a prompt string for AI task generation.
   *
   * @param prdText - The PRD content to include in the prompt
   * @param opts - Optional generation configuration to influence prompt
   * @returns A formatted prompt string
   */
  build(prdText: string, opts?: GeneratorOptions): string;
}
