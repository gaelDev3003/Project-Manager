/**
 * Business Validation Rules
 *
 * Purpose: Implement business logic validation rules for task graphs including
 * unique ID validation, dependency cycle detection, and dependency sanitization.
 * These rules enforce referential integrity and graph validity beyond schema validation.
 *
 * Dependencies: core/types
 * Usage: Imported by services and generators for validating task collections
 */

import type { Task } from '../types';

/**
 * Result type for unique ID validation.
 */
export interface UniqueIdValidationResult {
  valid: boolean;
  duplicates: string[];
}

/**
 * Result type for cycle detection.
 */
export interface CycleDetectionResult {
  hasCycle: boolean;
  path?: string[];
}

/**
 * Validates that all task IDs in the array are unique.
 *
 * Business Rule: Each task must have a unique ID within the task collection.
 * Duplicate IDs would cause referential integrity issues and ambiguous dependencies.
 *
 * @param tasks - Array of tasks to validate
 * @returns Result object with validation status and list of duplicate IDs
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'T-001', ... },
 *   { id: 'T-002', ... },
 *   { id: 'T-001', ... } // duplicate!
 * ];
 * const result = validateUniqueIds(tasks);
 * // result = { valid: false, duplicates: ['T-001'] }
 * ```
 */
export function validateUniqueIds(tasks: Task[]): UniqueIdValidationResult {
  // Handle edge case: empty array is valid
  if (tasks.length === 0) {
    return { valid: true, duplicates: [] };
  }

  // Track seen IDs and duplicates
  const seenIds = new Set<string>();
  const duplicates = new Set<string>();

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      duplicates.add(task.id);
    } else {
      seenIds.add(task.id);
    }
  }

  return {
    valid: duplicates.size === 0,
    duplicates: Array.from(duplicates).sort(),
  };
}

/**
 * Detects circular dependencies in the task graph using Depth-First Search (DFS).
 *
 * Business Rule: Task dependencies must form a Directed Acyclic Graph (DAG).
 * Cycles would create impossible dependency chains (A depends on B depends on A).
 *
 * Algorithm: Uses DFS with a recursion stack to detect back edges (cycles).
 * - White (unvisited): not yet processed
 * - Gray (visiting): currently in recursion stack
 * - Black (visited): fully processed
 *
 * Time Complexity: O(V + E) where V = number of tasks, E = number of dependencies
 * Space Complexity: O(V) for the recursion stack and state tracking
 *
 * @param tasks - Array of tasks to check for cycles
 * @returns Result object with cycle detection status and cycle path if found
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'T-001', deps: ['T-002'] },
 *   { id: 'T-002', deps: ['T-003'] },
 *   { id: 'T-003', deps: ['T-001'] } // cycle!
 * ];
 * const result = detectCycles(tasks);
 * // result = { hasCycle: true, path: ['T-001', 'T-002', 'T-003', 'T-001'] }
 * ```
 */
export function detectCycles(tasks: Task[]): CycleDetectionResult {
  // Handle edge cases
  if (tasks.length === 0) {
    return { hasCycle: false };
  }

  // Build adjacency list for the dependency graph
  const graph = new Map<string, string[]>();
  const taskIds = new Set<string>();

  for (const task of tasks) {
    taskIds.add(task.id);
    graph.set(task.id, task.deps);
  }

  // Check for self-dependencies (simplest cycle)
  for (const task of tasks) {
    if (task.deps.includes(task.id)) {
      return {
        hasCycle: true,
        path: [task.id, task.id],
      };
    }
  }

  // DFS state tracking
  const visited = new Set<string>(); // Black: fully processed nodes
  const visiting = new Set<string>(); // Gray: nodes in current recursion stack
  const parent = new Map<string, string>(); // For reconstructing cycle path

  /**
   * DFS helper function to explore the graph and detect cycles.
   *
   * @param nodeId - Current node being explored
   * @param path - Current path from root to this node
   * @returns Cycle path if found, undefined otherwise
   */
  function dfs(nodeId: string, path: string[]): string[] | undefined {
    // Mark as visiting (gray)
    visiting.add(nodeId);

    // Explore all dependencies
    const dependencies = graph.get(nodeId) || [];

    for (const depId of dependencies) {
      // Skip dependencies that don't exist in the task set
      // (these are handled by sanitizeDependencies)
      if (!taskIds.has(depId)) {
        continue;
      }

      // Back edge detected - cycle found!
      if (visiting.has(depId)) {
        // Reconstruct the cycle path
        const cycleStart = path.indexOf(depId);
        if (cycleStart !== -1) {
          return [...path.slice(cycleStart), depId];
        }
        // If depId is not in current path, build from parent map
        return [...path, depId];
      }

      // Skip already processed nodes (forward/cross edges)
      if (visited.has(depId)) {
        continue;
      }

      // Explore unvisited dependency
      const cyclePath = dfs(depId, [...path, depId]);
      if (cyclePath) {
        return cyclePath;
      }
    }

    // Mark as visited (black) and remove from visiting (gray)
    visiting.delete(nodeId);
    visited.add(nodeId);

    return undefined;
  }

  // Run DFS from each unvisited node (handles disconnected components)
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      const cyclePath = dfs(task.id, [task.id]);
      if (cyclePath) {
        return {
          hasCycle: true,
          path: cyclePath,
        };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Removes invalid dependency references from tasks.
 *
 * Business Rule: Task dependencies must reference existing tasks within the collection.
 * Self-dependencies are not allowed as they create trivial cycles.
 *
 * This function sanitizes the dependency arrays by:
 * 1. Removing references to non-existent task IDs
 * 2. Removing self-dependencies (task depending on itself)
 * 3. Preserving original task order and other properties
 *
 * Note: This function creates new task objects and does not mutate the input.
 *
 * @param tasks - Array of tasks to sanitize
 * @returns New array of tasks with sanitized dependencies
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'T-001', deps: ['T-001', 'T-002', 'T-999'] },
 *   { id: 'T-002', deps: [] }
 * ];
 * const sanitized = sanitizeDependencies(tasks);
 * // Result: T-001 deps = ['T-002'] (self-ref and non-existent removed)
 * ```
 */
export function sanitizeDependencies(tasks: Task[]): Task[] {
  // Handle edge case: empty array
  if (tasks.length === 0) {
    return [];
  }

  // Build set of valid task IDs for O(1) lookup
  const validIds = new Set<string>(tasks.map((task) => task.id));

  // Sanitize dependencies for each task
  return tasks.map((task) => {
    const sanitizedDeps = task.deps.filter((depId) => {
      // Remove self-dependencies
      if (depId === task.id) {
        return false;
      }
      // Remove references to non-existent tasks
      if (!validIds.has(depId)) {
        return false;
      }
      return true;
    });

    // Return new task object with sanitized dependencies
    return {
      ...task,
      deps: sanitizedDeps,
    };
  });
}
