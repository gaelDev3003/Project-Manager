import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getTaskGen } from '@/adapters/taskmaker-adapter';
import { parseTasksJson } from '@taskmaker/core/validators/tasksSchema';

export const runtime = 'nodejs';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Simple in-memory rate limiter (for preview mode)
// In production, use Redis or similar for distributed rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  // Try to get IP from headers (X-Forwarded-For or X-Real-IP)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetTime < now) {
    // Reset or create new record
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

/**
 * Request body schema for task generation endpoint
 *
 * Input limits:
 * - prdText: min 10 chars, max 30000 chars (to prevent excessive token usage)
 * - prdName: optional, max 100 chars
 */
const TaskGenerateRequestSchema = z.object({
  prdText: z
    .string()
    .min(10, 'prdText must be at least 10 characters')
    .max(
      30000,
      'prdText must not exceed 30000 characters to prevent excessive token usage'
    ),
  prdName: z
    .string()
    .max(100, 'prdName must not exceed 100 characters')
    .optional(),
});

/**
 * POST /api/tasks/generate
 *
 * Generate tasks from PRD text (preview-only, no database writes).
 *
 * Request body:
 * - prdText (string, required): PRD content in markdown format (min 10 chars)
 * - prdName (string, optional): Name/identifier for the PRD
 *
 * Response:
 * - 200 OK: { prdName: string | null, tasks: TasksJson }
 * - 400 Bad Request: Invalid input (missing or too short prdText)
 * - 500 Internal Server Error: Task generation or validation failed
 *
 * Security: This endpoint is server-only. No authentication required for preview mode.
 * Future versions may add authentication and database persistence.
 */
export async function POST(req: Request) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(req);
    const rateLimitResult = checkRateLimit(rateLimitKey);

    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitMap.get(rateLimitKey)!.resetTime;
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

    const body = await req.json();

    // Validate request body with Zod schema
    const validationResult = TaskGenerateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { prdText, prdName } = validationResult.data;

    // Get task generator instance (lazy-initialized)
    const taskGen = await getTaskGen();

    // Generate tasks using the adapter (with timeout protection)
    const REQ_TIMEOUT_MS = parseInt(process.env.REQ_TIMEOUT_MS || '45000', 10);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), REQ_TIMEOUT_MS);
    });

    const tasks = await Promise.race([
      taskGen.generate(prdText),
      timeoutPromise,
    ]);

    // Validate the generated tasks with Zod schema
    const validated = parseTasksJson(tasks);

    // Return preview response (no database writes)
    return NextResponse.json(
      {
        prdName: prdName ?? null,
        tasks: validated,
      },
      {
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (err: unknown) {
    // Handle validation errors (from parseTasksJson)
    if (err && typeof err === 'object' && 'issues' in err) {
      return NextResponse.json(
        {
          error: 'Task validation failed',
          details: err.issues,
        },
        { status: 500 }
      );
    }

    // Handle other errors
    const errorMessage =
      err instanceof Error ? err.message : 'Internal server error';

    // Mask sensitive data in error messages
    const safeErrorMessage = errorMessage
      .replace(/sk-[a-zA-Z0-9]{32,}/g, 'sk-****')
      .replace(/sk_proj-[a-zA-Z0-9]{32,}/g, 'sk_proj-****')
      .replace(/[a-zA-Z0-9]{32,}/g, (match) => {
        // Mask long strings that might be API keys
        if (match.length > 32 && /^[a-zA-Z0-9]+$/.test(match)) {
          return match.slice(0, 4) + '…';
        }
        return match;
      });

    // Log full error to server console (not exposed to client)
    console.error('[tasks/generate] Error:', errorMessage);

    // Return safe error message to client
    return NextResponse.json({ error: safeErrorMessage }, { status: 500 });
  }
}
