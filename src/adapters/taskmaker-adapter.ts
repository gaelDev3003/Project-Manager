/**
 * TaskMaker Adapter
 *
 * Purpose: Bridge between the app's environment configuration and the taskMaker library.
 * This adapter reads environment variables once at module load time (server-only) and
 * provides a lazy-initialized singleton task generator instance using the config-injection factory.
 *
 * Security: This file should NEVER be imported by client-side code. It reads sensitive
 * API keys from process.env which are only available on the server.
 *
 * Dependencies: @taskmaker/ai/factory
 * Usage: Imported by API routes (server-only)
 *
 * Note: Uses lazy initialization to avoid loading generator classes at module load time.
 * This prevents Next.js from analyzing optional dependencies (openai, @anthropic-ai/sdk)
 * during the build process.
 */

import { createTaskGenerator, type Provider } from '@taskmaker/ai/factory';
import type { TaskGenerator } from '@taskmaker/core/types/tasks';

/**
 * Determine the provider from environment variable.
 * Defaults to 'mock' if MODEL_PROVIDER is not set or invalid.
 */
const provider = (process.env.MODEL_PROVIDER as Provider) ?? 'mock';

/**
 * Singleton task generator instance (lazy-initialized).
 * This is created on first access via getTaskGen().
 */
let taskGenInstance: TaskGenerator | null = null;

/**
 * Promise for the task generator creation (prevents multiple simultaneous initializations).
 */
let taskGenPromise: Promise<TaskGenerator> | null = null;

/**
 * Get or create the singleton task generator instance.
 *
 * Uses lazy initialization to avoid loading generator classes at module load time.
 * The generator is configured based on MODEL_PROVIDER:
 * - 'mock': No API key required, deterministic generation
 * - 'openai': Requires OPENAI_API_KEY
 * - 'anthropic': Requires ANTHROPIC_API_KEY
 *
 * Model selection:
 * - Uses OPENAI_PRD_MODEL if set (for OpenAI provider)
 * - Falls back to provider-specific defaults if not set
 *
 * @returns Promise resolving to a TaskGenerator instance
 * @throws Error if required API keys are missing for the selected provider
 */
export async function getTaskGen(): Promise<TaskGenerator> {
  // Return cached instance if already created
  if (taskGenInstance) {
    return taskGenInstance;
  }

  // If initialization is in progress, wait for it
  if (taskGenPromise) {
    return taskGenPromise;
  }

  // Start initialization
  taskGenPromise = createTaskGenerator({
  provider,
  model: process.env.OPENAI_PRD_MODEL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  }).then((instance) => {
    taskGenInstance = instance;
    return instance;
});

  return taskGenPromise;
}

