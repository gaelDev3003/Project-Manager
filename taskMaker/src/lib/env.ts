/**
 * @deprecated UNUSED after integration. Replaced by factory+adapter. Do not import.
 * Use @taskmaker/ai/factory instead.
 *
 * This file was used for direct environment variable access within the taskMaker library.
 * After integration, environment variables are read at the app level (src/lib/taskmaker-adapter.ts)
 * and injected via the config-injection factory pattern.
 */

import { z } from 'zod';

/**
 * Environment variable schema with validation rules
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Supabase Configuration - Required for database and authentication
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL'
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  // Service role key is server-only (no NEXT_PUBLIC_ prefix), so it's optional in client-side validation
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')).transform(val => val || undefined),

  // Feature Flags
  USE_MOCK: z
    .string()
    .default('false')
    .transform((val) => val === 'true')
    .pipe(z.boolean()),

  // AI Service Configuration
  MODEL_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
  OPENAI_API_KEY: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal('')).transform(val => val || undefined),
});

/**
 * Validated environment variables
 * This object is safe to use throughout the application
 */
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  USE_MOCK: process.env.USE_MOCK,
  MODEL_PROVIDER: process.env.MODEL_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
});

// Export the type for use in the application
export type Env = z.infer<typeof envSchema>;
