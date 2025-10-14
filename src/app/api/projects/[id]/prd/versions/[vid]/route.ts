import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

function getAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; vid: string } }
) {
  try {
    const supabase = getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Fallback to Authorization header if cookie session absent
      const token = getAuthToken(request);
      if (!token)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Use service client for token validation
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const {
        data: { user: tokenUser },
      } = await serviceClient.auth.getUser(token);
      if (!tokenUser)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: version, error } = await supabase
      .from('project_prd_versions')
      .select('*')
      .eq('id', params.vid)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 404 });

    return NextResponse.json({ version });
  } catch (_) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
