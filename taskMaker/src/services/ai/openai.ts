/**
 * OpenAI Task Generator
 *
 * Purpose: Generate tasks from PRD text using OpenAI GPT models.
 * This implementation provides AI-powered task generation using the OpenAI API.
 *
 * Dependencies: core/types, core/validators
 * Usage: Imported by services/ai/factory.ts
 *
 * Note: Uses direct fetch() calls instead of OpenAI SDK to avoid package dependencies.
 * This matches the approach used in src/app/api/gen/prd/route.ts
 */

import { buildTaskGenerationPrompt } from '../../core/prompt';
import { TasksJsonSchema } from '../../core/validators/tasksSchema';

import type {
  TaskGenerator,
  TasksJson,
  GeneratorOptions,
} from '../../core/types/tasks';

/**
 * OpenAITaskGenerator implements AI-powered task generation using OpenAI GPT models.
 *
 * Features:
 * - Uses GPT-4 or GPT-3.5-turbo for task generation
 * - Structured JSON output with response_format
 * - Retry logic for transient errors
 * - Zod validation of AI responses
 * - Direct fetch() calls (no SDK dependency, matches PRD generation approach)
 */
export class OpenAITaskGenerator implements TaskGenerator {
  private apiKey: string;
  private model: string;
  private readonly REQ_TIMEOUT_MS = 45000; // 45 seconds
  private readonly MAX_RETRIES = 2;
  private readonly BASE_DELAY_MS = 800; // 0.8 seconds

  /**
   * Create a new OpenAI task generator.
   *
   * @param apiKey - OpenAI API key
   * @param model - Model to use (default: gpt-4o-mini for cost efficiency)
   */
  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Extract first JSON object from a string (handles markdown code blocks).
   */
  private extractFirstJson(s: string): string {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON found in response');
    return m[0];
  }

  /**
   * Call OpenAI API using direct fetch() (matches PRD generation approach).
   */
  private async callOpenAIJSON(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number
  ): Promise<any> {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const t0 = Date.now();
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), this.REQ_TIMEOUT_MS);

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        const duration = Date.now() - t0;

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content ?? '';

        if (!content) {
          throw new Error('Empty content from OpenAI');
        }

        try {
          return JSON.parse(content);
        } catch {
          // Try extracting JSON from markdown code blocks
          return JSON.parse(this.extractFirstJson(content));
        }
      } catch (error: unknown) {
        const duration = Date.now() - t0;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (attempt === this.MAX_RETRIES) {
          throw error;
        }

        // Retry on AbortError, 408, 429, 5xx errors
        const shouldRetry =
          (error as { name?: string })?.name === 'AbortError' ||
          errorMessage.includes('408') ||
          errorMessage.includes('429') ||
          errorMessage.includes('5');

        if (shouldRetry) {
          const delay = this.BASE_DELAY_MS * Math.pow(1.3, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Unexpected: retry loop completed without result');
  }

  /**
   * Generate tasks from a PRD document using OpenAI.
   *
   * @param prdText - The PRD content in markdown format
   * @param opts - Optional generation configuration
   * @returns Promise resolving to a validated TasksJson object
   */
  async generate(prdText: string, opts?: GeneratorOptions): Promise<TasksJson> {
    // Build the prompt using core prompt builder
    const systemPrompt = buildTaskGenerationPrompt();
    const userPrompt = `Please generate tasks for the following PRD:\n\n${prdText}`;

    const model = opts?.model || this.model;
    const temperature = opts?.temperature ?? 0.7;

    // Call OpenAI with structured output using direct fetch
    const tasksJson = await this.callOpenAIJSON(
      systemPrompt,
      userPrompt,
      model,
      temperature
    );

    // Validate with Zod schema
    const validated = TasksJsonSchema.parse(tasksJson);

    // Apply maxTasks limit if specified
    if (opts?.maxTasks && validated.tasks.length > opts.maxTasks) {
      validated.tasks = validated.tasks.slice(0, opts.maxTasks);
    }

    return validated;
  }
}
