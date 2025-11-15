import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { parseTasksJson } from '@taskmaker/core/validators/tasksSchema';

export const runtime = 'nodejs';

/**
 * Request body schema for task save endpoint
 */
const TaskSaveRequestSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  prdVersionId: z.string().uuid('prdVersionId must be a valid UUID'),
  tasks: z.any(), // Will be validated by parseTasksJson
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
    const validationResult = TaskSaveRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { projectId, prdVersionId, tasks } = validationResult.data;

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

    // Verify PRD version exists and belongs to the project
    const { data: prdVersion, error: versionError } = await supabase
      .from('project_prd_versions')
      .select('id, project_prd_id')
      .eq('id', prdVersionId)
      .single();

    if (versionError || !prdVersion) {
      return NextResponse.json(
        { error: 'PRD version not found' },
        { status: 404 }
      );
    }

    // Verify PRD belongs to the project
    const { data: prd, error: prdError } = await supabase
      .from('project_prds')
      .select('id')
      .eq('id', prdVersion.project_prd_id)
      .eq('project_id', projectId)
      .single();

    if (prdError || !prd) {
      return NextResponse.json(
        { error: 'PRD version does not belong to this project' },
        { status: 403 }
      );
    }

    // Validate tasks JSON structure using taskMaker validator
    let validatedTasks;
    try {
      validatedTasks = parseTasksJson(tasks);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid tasks structure',
          details:
            error instanceof Error ? error.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    // Insert task record
    const { data: inserted, error: insertError } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        prd_version_id: prdVersionId,
        tasks_json: validatedTasks,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting task:', insertError);
      return NextResponse.json(
        { error: 'Failed to save tasks', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: inserted.id }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in task save:', error);
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

