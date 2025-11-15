/**
 * Task Validation Schemas
 *
 * Purpose: Define Zod schemas for runtime validation of task-related data structures.
 * These schemas enforce business rules and data integrity constraints at runtime,
 * providing type-safe validation for task objects and tasks.json files.
 *
 * Dependencies: zod, core/types
 * Usage: Imported by services, API routes, and generators
 */

import { z } from 'zod';

/**
 * Schema for priority levels.
 */
export const PrioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);

/**
 * Schema for risk levels.
 */
export const RiskSchema = z.enum(['low', 'medium', 'high']);

/**
 * Schema for role classifications.
 */
export const RoleSchema = z.enum(['frontend', 'backend', 'infra', 'qa', 'pm']);

/**
 * Schema for task status.
 */
export const TaskStatusSchema = z.enum(['planned', 'in-progress', 'completed']);

/**
 * Schema for task metadata.
 *
 * Business Rules:
 * - priority: Must be P0, P1, P2, or P3
 * - risk: Must be low, medium, or high
 * - effort_hours: Must be between 2 and 24 hours
 * - role: Must be one of the defined roles
 * - status: Must be one of the defined statuses
 * - created: Must be ISO 8601 timestamp
 * - updated: Must be ISO 8601 timestamp
 */
export const TaskMetadataSchema = z.object({
  priority: PrioritySchema,
  risk: RiskSchema,
  effort_hours: z
    .number()
    .min(2, 'Effort must be at least 2 hours')
    .max(24, 'Effort must be at most 24 hours'),
  role: RoleSchema,
  status: TaskStatusSchema,
  created: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Created timestamp must be valid ISO 8601 format',
  }),
  updated: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Updated timestamp must be valid ISO 8601 format',
  }),
});

/**
 * Schema for validating individual Task objects.
 *
 * Business Rules:
 * - id: Must match pattern [A-Z]-\d{3} (e.g., T-001, A-042)
 * - id: Length 1-32 characters
 * - title: Must be 3-140 characters
 * - description: Optional, one-sentence functional goal
 * - details: Optional, short implementation plan
 * - testStrategy: Optional, specific verification approach
 * - tags: Maximum 8 tags, defaults to empty array
 * - deps: Maximum 16 dependencies, defaults to empty array
 * - steps: Must have 1-20 non-empty steps
 * - metadata: Optional task metadata
 */
export const TaskSchema = z.object({
  id: z
    .string()
    .min(1, 'Task ID cannot be empty')
    .max(32, 'Task ID must be 32 characters or less')
    .regex(
      /^[A-Z]-\d{3}$/,
      'Task ID must match pattern [A-Z]-[0-9][0-9][0-9] (e.g., T-001, A-042)'
    ),
  title: z
    .string()
    .min(3, 'Task title must be at least 3 characters')
    .max(140, 'Task title must be 140 characters or less'),
  description: z.string().optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  tags: z
    .array(z.string())
    .max(8, 'Tasks cannot have more than 8 tags')
    .default([]),
  deps: z
    .array(z.string())
    .max(16, 'Tasks cannot have more than 16 dependencies')
    .default([]),
  steps: z
    .array(z.string().min(1, 'Task step cannot be empty'))
    .min(1, 'Tasks must have at least 1 step')
    .max(20, 'Tasks cannot have more than 20 steps'),
  metadata: TaskMetadataSchema.optional(),
});

/**
 * Schema for version information.
 */
export const VersionInfoSchema = z.object({
  schema: z.string(),
  generator: z.string(),
  source_prd: z.string().optional(),
});

/**
 * Schema for validating the complete tasks.json file structure.
 *
 * Business Rules:
 * - version: Can be string (backward compatibility) or VersionInfo object
 * - tasks: Must contain 1-200 valid Task objects
 */
export const TasksJsonSchema = z.object({
  version: z.union([z.string(), VersionInfoSchema]).default('1.0'),
  tasks: z
    .array(TaskSchema)
    .min(1, 'TasksJson must contain at least 1 task')
    .max(200, 'TasksJson cannot contain more than 200 tasks'),
});

/**
 * Type inference utilities for TypeScript integration.
 *
 * These types are inferred from the Zod schemas, ensuring that runtime
 * validation and compile-time types stay in sync.
 */
export type TaskSchemaType = z.infer<typeof TaskSchema>;
export type TasksJsonSchemaType = z.infer<typeof TasksJsonSchema>;

/**
 * Parse and validate a Task object with detailed error messages.
 *
 * @param data - Unknown data to validate as a Task
 * @returns Validated Task object
 * @throws ZodError with detailed validation errors if invalid
 */
export function parseTask(data: unknown): TaskSchemaType {
  return TaskSchema.parse(data);
}

/**
 * Parse and validate a TasksJson object with detailed error messages.
 *
 * @param data - Unknown data to validate as TasksJson
 * @returns Validated TasksJson object
 * @throws ZodError with detailed validation errors if invalid
 */
export function parseTasksJson(data: unknown): TasksJsonSchemaType {
  return TasksJsonSchema.parse(data);
}

/**
 * Safely parse a Task object without throwing.
 *
 * @param data - Unknown data to validate as a Task
 * @returns Success object with data or error object with issues
 */
export function safeParseTask(data: unknown) {
  return TaskSchema.safeParse(data);
}

/**
 * Safely parse a TasksJson object without throwing.
 *
 * @param data - Unknown data to validate as TasksJson
 * @returns Success object with data or error object with issues
 */
export function safeParseTasksJson(data: unknown) {
  return TasksJsonSchema.safeParse(data);
}
