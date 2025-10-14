import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { computeFeatureDiff } from '@/lib/feature-diff';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const compareTo = searchParams.get('compareTo');

    if (!compareTo) {
      return NextResponse.json(
        { error: 'compareTo parameter is required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current version features
    const { data: currFeatures, error: currError } = await supabase
      .from('prd_features')
      .select('*')
      .eq('prd_version_id', params.versionId)
      .order('created_at', { ascending: true });

    if (currError) {
      console.error('Error fetching current features:', currError);
      return NextResponse.json(
        { error: 'Failed to fetch current features' },
        { status: 500 }
      );
    }

    // Get previous version features
    const { data: prevFeatures, error: prevError } = await supabase
      .from('prd_features')
      .select('*')
      .eq('prd_version_id', compareTo)
      .order('created_at', { ascending: true });

    if (prevError) {
      console.error('Error fetching previous features:', prevError);
      return NextResponse.json(
        { error: 'Failed to fetch previous features' },
        { status: 500 }
      );
    }

    // Compute diff
    const diff = computeFeatureDiff(prevFeatures || [], currFeatures || []);

    return NextResponse.json(diff);
  } catch (error) {
    console.error('Feature diff error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
