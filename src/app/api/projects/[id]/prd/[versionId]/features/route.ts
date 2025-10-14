import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

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

    // v0 형식에 맞게 단순화된 Features API
    const { data: features, error, count } = await supabase
      .from('prd_features')
      .select('name, created_at', { count: 'exact' })
      .eq('project_id', params.id)
      .eq('prd_version_id', params.versionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching features:', error);
      return NextResponse.json(
        { error: 'Failed to fetch features' },
        { status: 500 }
      );
    }

    const total = count || 0;

    return NextResponse.json({
      total,
      features: features || [],
    });
  } catch (error) {
    console.error('Error in features API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
