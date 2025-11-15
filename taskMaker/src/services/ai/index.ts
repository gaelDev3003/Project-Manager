/**
 * @deprecated UNUSED after integration. Replaced by factory+adapter. Do not import.
 * Use @taskmaker/ai/factory instead.
 *
 * This file contained an environment-bound factory that directly accessed process.env.
 * After integration, use the config-injection factory (factory.ts) which accepts
 * configuration objects, allowing the library to be environment-agnostic.
 *
 * Migration guide:
 * - Old: import { createTaskGenerator } from './services/ai/index'
 * - New: import { createTaskGenerator } from '@taskmaker/ai/factory'
 * - Old: const gen = createTaskGenerator() // reads env internally
 * - New: const gen = createTaskGenerator({ provider, apiKey, ... }) // config injection
 */

/**
 * AI Service Layer
 *
 * Purpose: Handle all interactions with the Claude AI API.
 * This layer provides high-level services for AI-powered task generation, epic creation,
 * and requirement analysis. It encapsulates the Anthropic API integration and manages
 * prompt execution, response parsing, and error handling.
 *
 * Dependencies: core/types, core/prompt, core/validators
 * Usage: Imported by features and API routes
 */

import { env } from '../../lib/env';

// Dynamic imports to avoid build-time dependencies on optional packages
// These are only loaded when needed, preventing Next.js from analyzing them at build time
// import { AnthropicTaskGenerator } from './anthropic'; // REMOVED: Static import causes build issues
// import { OpenAITaskGenerator } from './openai'; // REMOVED: Static import causes build issues
import { MockTaskGenerator } from './mock'; // Mock can be imported statically (no external deps)

import type { TaskGenerator } from '../../core/types/tasks';

/**
 * Information about which generator was created.
 */
export interface GeneratorInfo {
  generator: TaskGenerator;
  provider: 'mock' | 'openai' | 'anthropic';
  model: string;
}

/**
 * Factory function to create a TaskGenerator instance with metadata.
 *
 * Supports multiple generation modes:
 * - mock: Deterministic regex-based generation (no API calls)
 * - ai: AI-powered generation using configured MODEL_PROVIDER
 *
 * @param mode - The generation mode (default: from USE_MOCK env var)
 * @returns Generator info with instance, provider, and model
 * @deprecated This function is deprecated. Use @taskmaker/ai/factory instead.
 */
export async function createTaskGenerator(mode?: 'mock' | 'ai'): Promise<GeneratorInfo> {
  // Determine mode from environment if not specified
  const generationMode = mode || (env.USE_MOCK ? 'mock' : 'ai');

  switch (generationMode) {
    case 'mock':
      return {
        generator: new MockTaskGenerator(),
        provider: 'mock',
        model: 'mock:v1'
      };

    case 'ai':
      // Use MODEL_PROVIDER to select AI provider
      // NOTE: This deprecated file should not be used. Use @taskmaker/ai/factory instead.
      // Dynamic imports are required to avoid build-time dependencies.
      switch (env.MODEL_PROVIDER) {
        case 'openai':
          if (!env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required when MODEL_PROVIDER=openai');
          }
          // Dynamic import to avoid build-time dependency
          const { OpenAITaskGenerator } = await import('./openai');
          return {
            generator: new OpenAITaskGenerator(env.OPENAI_API_KEY),
            provider: 'openai',
            model: 'gpt-4o-mini'  // Default OpenAI model
          };

        case 'anthropic':
          if (!env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is required when MODEL_PROVIDER=anthropic');
          }
          // Dynamic import to avoid build-time dependency
          const { AnthropicTaskGenerator } = await import('./anthropic');
          return {
            generator: new AnthropicTaskGenerator(env.ANTHROPIC_API_KEY),
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022'  // Default Anthropic model
          };

        default:
          throw new Error(`Unknown MODEL_PROVIDER: ${env.MODEL_PROVIDER}`);
      }

    default:
      return {
        generator: new MockTaskGenerator(),
        provider: 'mock',
        model: 'mock:v1'
      };
  }
}

/**
 * Default export: Mock generator for immediate use.
 *
 * This provides a convenient default for development and testing.
 * Production code should use createTaskGenerator() for explicit mode selection.
 */
export const defaultTaskGenerator = new MockTaskGenerator();

/**
 * Export the MockTaskGenerator class for direct instantiation if needed.
 */
export { MockTaskGenerator } from './mock';
