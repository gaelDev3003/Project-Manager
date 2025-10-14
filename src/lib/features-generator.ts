import { Feature } from '@/types/prd';

/**
 * Extract features from PRD data - v0 형식에 맞게 단순화
 * Features는 단순한 이름 목록으로만 처리
 */
export function extractFeaturesFromPRD(prdData: any): Feature[] {
  let features: Feature[] = [];

  // If features already exist, use them
  if (
    prdData.features &&
    Array.isArray(prdData.features) &&
    prdData.features.length > 0
  ) {
    features = prdData.features.map((feature: any) => ({
      name: typeof feature === 'string' ? feature : feature.name || 'Unnamed Feature',
    }));
  }
  // Otherwise, derive from key_features
  else if (prdData.key_features && Array.isArray(prdData.key_features) && prdData.key_features.length > 0) {
    features = prdData.key_features.map((feature: string) => ({
      name: feature,
    }));
  }

  return features;
}


/**
 * Save features to database - v0 형식에 맞게 단순화
 */
export async function savePRDFeatures(
  supabase: any,
  projectId: string,
  prdVersionId: string,
  features: Feature[],
  userId: string
) {
  const featureRecords = features.map((feature) => ({
    project_id: projectId,
    prd_version_id: prdVersionId,
    name: feature.name,
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from('prd_features')
    .insert(featureRecords)
    .select();

  if (error) {
    console.error('Error saving PRD features:', error);
    throw new Error(`Failed to save features: ${error.message}`);
  }

  return data;
}
