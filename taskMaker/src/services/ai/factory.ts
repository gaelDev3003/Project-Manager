/**
 * Config-Injection Factory for Task Generators
 *
 * Purpose: Create task generator instances without direct environment variable access.
 * This factory accepts configuration objects, allowing the library to be environment-agnostic.
 *
 * Dependencies: services/ai/mock, services/ai/openai, services/ai/anthropic (loaded dynamically)
 * Usage: Imported by app-level adapters that read environment variables
 *
 * Note: Uses dynamic imports to avoid build-time dependencies on optional packages (openai, @anthropic-ai/sdk).
 * This allows the library to work even when these packages are not installed.
 */

import type { TaskGenerator } from '../../core/types/tasks';

/**
 * Supported AI providers for task generation.
 */
export type Provider = 'mock' | 'openai' | 'anthropic';

/**
 * Configuration for creating a task generator instance.
 *
 * @property provider - The AI provider to use ('mock', 'openai', or 'anthropic')
 * @property model - Optional model name override (defaults to provider-specific defaults)
 * @property openaiApiKey - Required when provider is 'openai'
 * @property anthropicApiKey - Required when provider is 'anthropic'
 */
export interface TaskGenConfig {
  provider: Provider;
  model?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

/**
 * Create a task generator instance based on the provided configuration.
 *
 * This factory function instantiates the appropriate generator class based on
 * the provider specified in the config. It validates that required API keys
 * are present before creating generators that require them.
 *
 * Uses dynamic imports to avoid build-time dependencies on optional packages.
 * This allows Next.js to build successfully even when openai/@anthropic-ai/sdk
 * are not installed.
 *
 * @param cfg - Configuration object specifying provider and API keys
 * @returns Promise resolving to a TaskGenerator instance ready to use
 * @throws Error if required API keys are missing for the selected provider
 *
 * @example
 * ```ts
 * // Mock generator (no API key needed)
 * const mockGen = await createTaskGenerator({ provider: 'mock' });
 *
 * // OpenAI generator
 * const openaiGen = await createTaskGenerator({
 *   provider: 'openai',
 *   openaiApiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o-mini'
 * });
 *
 * // Anthropic generator
 * const anthropicGen = await createTaskGenerator({
 *   provider: 'anthropic',
 *   anthropicApiKey: process.env.ANTHROPIC_API_KEY,
 *   model: 'claude-3-5-sonnet-20241022'
 * });
 * ```
 */
export async function createTaskGenerator(
  cfg: TaskGenConfig
): Promise<TaskGenerator> {
  switch (cfg.provider) {
    case 'mock': {
      // Mock generator can be imported statically as it has no external dependencies
      const { MockTaskGenerator } = await import('./mock');
      return new MockTaskGenerator();
    }

    case 'openai': {
      if (!cfg.openaiApiKey) {
        throw new Error(
          'OPENAI_API_KEY is required when provider is "openai"'
        );
      }
      // Dynamic import - avoids build-time dependency on 'openai' package
      const { OpenAITaskGenerator } = await import('./openai');
      return new OpenAITaskGenerator(cfg.openaiApiKey, cfg.model);
    }

    case 'anthropic': {
      if (!cfg.anthropicApiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY is required when provider is "anthropic"'
        );
      }
      // Dynamic import - avoids build-time dependency on '@anthropic-ai/sdk' package
      const { AnthropicTaskGenerator } = await import('./anthropic');
      return new AnthropicTaskGenerator(cfg.anthropicApiKey, cfg.model);
    }

    default: {
      // Exhaustive check for TypeScript
      const _exhaustive: never = cfg.provider;
      throw new Error(`Unsupported provider: ${_exhaustive}`);
    }
  }
}

