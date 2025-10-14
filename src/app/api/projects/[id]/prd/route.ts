import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  extractFeaturesFromPRD,
  savePRDFeatures,
} from '@/lib/features-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();
    const body = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create initial PRD for the project
    const { data: prdData, error } = await supabase
      .from('project_prds')
      .insert({
        project_id: params.id,
        current_version: 1,
        summary: body.summary || 'Initial PRD',
        goals: body.goals || [],
        key_features: body.key_features || [],
        out_of_scope: body.out_of_scope || [],
        risks: body.risks || [],
        acceptance: body.acceptance || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating PRD:', error);
      return NextResponse.json(
        { error: 'Failed to create PRD' },
        { status: 500 }
      );
    }

    // Create initial version
    const { data: versionData, error: versionError } = await supabase
      .from('project_prd_versions')
      .insert({
        project_prd_id: prdData.id,
        version: 1,
        status: 'draft',
        content_md: `# ${body.summary || 'Initial PRD'}\n\n${body.goals?.map((goal: string) => `- ${goal}`).join('\n') || 'No goals specified'}`,
        summary_json: {
          goal: body.summary || 'Initial PRD',
          kpi: body.goals || [],
          problemSolution:
            body.key_features?.join(', ') || 'No features specified',
          priority: 'medium',
          risk: 'low',
          dependencies: [],
          effort: 'TBD',
        },
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating PRD version:', versionError);
      return NextResponse.json(
        { error: 'Failed to create PRD version' },
        { status: 500 }
      );
    }

    // Extract and save features using upsert function
    const features = extractFeaturesFromPRD(body);
    
    // Ensure we have at least one feature
    if (features.length === 0) {
      features.push({
        name: body.summary || 'Core Capability',
        priority: 'medium',
        risk: 'low',
        effort: 'medium',
        impacts: [],
        dependencies: [],
        tags: [],
        notes: 'Automatically generated core feature.',
      });
    }

    // Use upsert function for atomic feature creation
    const { error: upsertError } = await supabase.rpc('upsert_prd_features', {
      _project: params.id,
      _version: versionData.id,
      _features: features,
      _user: user.id,
    });

    if (upsertError) {
      console.error('Error upserting features:', upsertError);
      // Compensating transaction: delete the PRD version
      await supabase
        .from('project_prd_versions')
        .delete()
        .eq('id', versionData.id);
      await supabase
        .from('project_prds')
        .delete()
        .eq('id', prdData.id);
      
      return NextResponse.json(
        { error: 'Failed to save features. PRD creation rolled back.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prd: prdData,
      version: versionData,
    });
  } catch (error) {
    console.error('Error in PRD creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();

    // Get the most recent PRD for this project
    const { data: prdData, error } = await supabase
      .from('project_prds')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      console.error('Error fetching PRD:', error);
      return NextResponse.json(
        { error: 'Failed to fetch PRD' },
        { status: 500 }
      );
    }

    // Transform prd_data to top-level fields
    if (prdData) {
      if (prdData.prd_data) {
        // Old format with prd_data field
        const { prd_data, ...metadata } = prdData;
        return NextResponse.json({
          ...metadata,
          ...prd_data,
        });
      } else {
        // New format with direct fields
        return NextResponse.json(prdData);
      }
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error('Error in PRD API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
