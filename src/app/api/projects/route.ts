import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create initial v0 PRD (hidden from user)
    const { data: prdData, error: prdError } = await supabase
      .from('project_prds')
      .insert({
        project_id: project.id,
        current_version: 0,
        summary: 'Initial PRD (v0)',
        goals: [],
        key_features: [],
        out_of_scope: [],
        risks: [],
        acceptance: [],
      })
      .select()
      .single();

    if (prdError) {
      console.error('Error creating initial PRD:', prdError);
      // Don't fail the project creation if PRD creation fails
    } else {
      // Create v0 version (hidden)
      const { error: versionError } = await supabase
        .from('project_prd_versions')
        .insert({
          project_prd_id: prdData.id,
          version: 0,
          status: 'draft', // v0 version (will be filtered out in UI)
          content_md: '# Initial PRD (v0)\n\nThis is a placeholder version.',
          summary_json: {
            goal: 'Initial PRD (v0)',
            kpi: [],
            problemSolution: 'Placeholder content',
            priority: 'low',
            risk: 'low',
            dependencies: [],
            effort: 'TBD',
            features: [],
            key_features: [],
            summary: 'Initial PRD (v0)',
            goals: [],
          },
          created_by: user.id,
        });

      if (versionError) {
        console.error('Error creating initial PRD version:', versionError);
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
