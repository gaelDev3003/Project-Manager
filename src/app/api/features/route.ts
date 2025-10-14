import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const versionId = searchParams.get('versionId');
    const sort = searchParams.get('sort') || 'priority';
    const priority = searchParams.getAll('priority');
    const risk = searchParams.getAll('risk');
    const tags = searchParams.getAll('tags');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (!projectId || !versionId) {
      return NextResponse.json(
        { error: 'Missing projectId or versionId' },
        { status: 400 }
      );
    }

    // Build base query for counts and top3
    let baseQuery = supabase
      .from('prd_features')
      .select('priority, risk, effort')
      .eq('project_id', projectId)
      .eq('prd_version_id', versionId);

    // Build filtered query for paginated results
    let filteredQuery = supabase
      .from('prd_features')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('prd_version_id', versionId);

    // Apply filters
    if (priority.length > 0) {
      filteredQuery = filteredQuery.in('priority', priority);
    }
    if (risk.length > 0) {
      filteredQuery = filteredQuery.in('risk', risk);
    }
    if (tags.length > 0) {
      filteredQuery = filteredQuery.overlaps('tags', tags);
    }

    // Apply sorting with custom order
    if (sort === 'priority') {
      filteredQuery = filteredQuery.order('priority', { ascending: false });
    } else if (sort === 'risk') {
      filteredQuery = filteredQuery.order('risk', { ascending: false });
    } else if (sort === 'effort') {
      filteredQuery = filteredQuery.order('effort', { ascending: false });
    }
    // Add secondary sort for consistency
    filteredQuery = filteredQuery.order('created_at', { ascending: false });

    // Apply pagination
    filteredQuery = filteredQuery.range(offset, offset + limit - 1);

    // Execute queries in parallel
    const [
      { data: allData, error: allError },
      { data: filteredData, error, count },
    ] = await Promise.all([baseQuery, filteredQuery]);

    if (allError) {
      console.error('Error fetching all features for counts:', allError);
    }
    if (error) {
      console.error('Error fetching filtered features:', error);
      return NextResponse.json(
        { error: 'Failed to fetch features' },
        { status: 500 }
      );
    }

    const total = count || 0;

    // Calculate counts from all data
    const counts = {
      highPriority: allData?.filter((f) => f.priority === 'high').length || 0,
      highRisk: allData?.filter((f) => f.risk === 'high').length || 0,
      highEffort: allData?.filter((f) => f.effort === 'high').length || 0,
    };

    // Get top 3 features (highest priority, then highest risk)
    const top3Query = supabase
      .from('prd_features')
      .select('*')
      .eq('project_id', projectId)
      .eq('prd_version_id', versionId)
      .order('priority', { ascending: false })
      .order('risk', { ascending: false })
      .limit(3);

    const { data: top3, error: top3Error } = await top3Query;
    if (top3Error) {
      console.error('Error fetching top 3 features:', top3Error);
    }

    return NextResponse.json({
      total,
      counts,
      top3: top3 || [],
      items: filteredData || [],
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error in features API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
