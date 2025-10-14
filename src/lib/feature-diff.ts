import { Feature } from '@/types/prd';

export interface FeatureDiff {
  added: Feature[];
  modified: Array<{
    name: string;
    before: Feature;
    after: Feature;
  }>;
  removed: Feature[];
}

/**
 * Compute feature diff between two PRD versions
 * Matches features by lowercased name
 */
export function computeFeatureDiff(
  prevFeatures: Feature[],
  currFeatures: Feature[]
): FeatureDiff {
  const prevMap = new Map<string, Feature>();
  const currMap = new Map<string, Feature>();

  // Create maps with lowercase names as keys
  prevFeatures.forEach((feature) => {
    prevMap.set(feature.name.toLowerCase(), feature);
  });

  currFeatures.forEach((feature) => {
    currMap.set(feature.name.toLowerCase(), feature);
  });

  const added: Feature[] = [];
  const modified: Array<{ name: string; before: Feature; after: Feature }> = [];
  const removed: Feature[] = [];

  // Find added and modified features
  for (const [name, currFeature] of currMap) {
    const prevFeature = prevMap.get(name);

    if (!prevFeature) {
      // Feature is new
      added.push(currFeature);
    } else {
      // Check if feature was modified
      if (hasFeatureChanged(prevFeature, currFeature)) {
        modified.push({
          name: currFeature.name,
          before: prevFeature,
          after: currFeature,
        });
      }
    }
  }

  // Find removed features
  for (const [name, prevFeature] of prevMap) {
    if (!currMap.has(name)) {
      removed.push(prevFeature);
    }
  }

  return { added, modified, removed };
}

/**
 * Check if a feature has changed between versions
 */
function hasFeatureChanged(prev: Feature, curr: Feature): boolean {
  // Compare all fields except name (which is used for matching)
  return (
    prev.priority !== curr.priority ||
    prev.risk !== curr.risk ||
    prev.effort !== curr.effort ||
    !arraysEqual(prev.impacts || [], curr.impacts || []) ||
    !arraysEqual(prev.tags || [], curr.tags || []) ||
    !arraysEqual(prev.dependencies || [], curr.dependencies || []) ||
    prev.notes !== curr.notes
  );
}

/**
 * Compare two arrays for equality (order-independent)
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, index) => val === sortedB[index]);
}

/**
 * Get feature diff summary text
 */
export function getFeatureDiffSummary(diff: FeatureDiff): string {
  const { added, modified, removed } = diff;

  const parts: string[] = [];

  if (added.length > 0) {
    parts.push(`${added.length} added`);
  }

  if (modified.length > 0) {
    parts.push(`${modified.length} modified`);
  }

  if (removed.length > 0) {
    parts.push(`${removed.length} removed`);
  }

  return parts.length > 0
    ? `Features: ${parts.join(' · ')}`
    : 'Features: No changes';
}
