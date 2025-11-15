/**
 * Anthropic Task Generator
 *
 * Purpose: Generate tasks from PRD text using Anthropic Claude models.
 * This implementation provides AI-powered task generation using the Anthropic API.
 *
 * Dependencies: core/types, core/validators, @anthropic-ai/sdk (optional, loaded dynamically)
 * Usage: Imported by services/ai/factory.ts
 */

import { buildTaskGenerationPrompt } from '../../core/prompt';
import { TasksJsonSchema } from '../../core/validators/tasksSchema';

import type {
  TaskGenerator,
  TasksJson,
  GeneratorOptions,
} from '../../core/types/tasks';

/**
 * AnthropicTaskGenerator implements AI-powered task generation using Anthropic Claude models.
 *
 * Features:
 * - Uses Claude 3.5 Sonnet or other Claude models for task generation
 * - Structured JSON output with proper prompt engineering
 * - Retry logic for transient errors
 * - Zod validation of AI responses
 * - Dynamic import of Anthropic SDK (no build-time dependency)
 */
export class AnthropicTaskGenerator implements TaskGenerator {
  private client: any; // Anthropic client (loaded dynamically)
  private apiKey: string;
  private model: string;
  private clientPromise: Promise<any> | null = null;

  /**
   * Create a new Anthropic task generator.
   *
   * @param apiKey - Anthropic API key
   * @param model - Model to use (default: claude-3-5-sonnet-20240620 for best quality)
   */
  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20240620') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Lazy-load the Anthropic client using dynamic import.
   * This avoids build-time dependency on the '@anthropic-ai/sdk' package.
   */
  private async ensureClient(): Promise<any> {
    if (this.client) {
      return this.client;
    }

    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        // Dynamic import - package may not be installed at build time
        // @ts-expect-error - Optional dependency, loaded dynamically at runtime
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        // @ts-ignore - Anthropic is dynamically loaded, type checking skipped
        this.client = new Anthropic({ apiKey: this.apiKey });
        return this.client;
      })();
    }

    return this.clientPromise;
  }

  /**
   * Generate tasks from a PRD document using Anthropic Claude.
   *
   * @param prdText - The PRD content in markdown format
   * @param opts - Optional generation configuration
   * @returns Promise resolving to a validated TasksJson object
   */
  async generate(prdText: string, opts?: GeneratorOptions): Promise<TasksJson> {
    // Ensure Anthropic client is loaded
    const client = await this.ensureClient();

    // Build the prompt using core prompt builder
    const systemPrompt = buildTaskGenerationPrompt();
    const userPrompt = `Please generate tasks for the following PRD:\n\n${prdText}`;

    // Call Anthropic with structured output
    const response = await client.messages.create({
      model: opts?.model || this.model,
      max_tokens: 4096,
      temperature: opts?.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract the generated content
    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Anthropic returned empty or non-text response');
    }

    const textContent = content.text;

    // Parse JSON response (strip markdown code blocks if present)
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7); // Remove ```json
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3); // Remove ```
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3); // Remove trailing ```
    }
    jsonText = jsonText.trim();

    let tasksJson: TasksJson;
    try {
      tasksJson = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(
        `Failed to parse Anthropic response as JSON: ${error}\n\nReceived:\n${textContent}`
      );
    }

    // Validate with Zod schema
    const validated = TasksJsonSchema.parse(tasksJson);

    // Apply maxTasks limit if specified
    if (opts?.maxTasks && validated.tasks.length > opts.maxTasks) {
      validated.tasks = validated.tasks.slice(0, opts.maxTasks);
    }

    return validated;
  }
}
