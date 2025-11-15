import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Request body schema for task retrieval by version
 */
const TaskByVersionRequestSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  prdVersionId: z.string().uuid('prdVersionId must be a valid UUID'),
});

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();

    let user = cookieUser;

    // Fallback to Authorization header if cookie session absent
    if (!user) {
      const token = getAuthToken(request);
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Use service client for token validation
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const {
        data: { user: tokenUser },
        error: authError,
      } = await serviceClient.auth.getUser(token);
      if (authError || !tokenUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = tokenUser;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = TaskByVersionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { projectId, prdVersionId } = validationResult.data;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the latest task record for this project and PRD version
    const { data: taskRecord, error: taskError } = await supabase
      .from('project_tasks')
      .select('tasks_json')
      .eq('project_id', projectId)
      .eq('prd_version_id', prdVersionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (taskError) {
      console.error('Error fetching tasks:', taskError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: taskError.message },
        { status: 500 }
      );
    }

    // Return tasks if found, otherwise null
    return NextResponse.json({
      tasks: taskRecord?.tasks_json || null,
    });
  } catch (error) {
    console.error('Unexpected error in task retrieval:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          error instanceof Error
            ? error.message.replace(/api[Kk]ey|token|secret/gi, '[REDACTED]')
            : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

