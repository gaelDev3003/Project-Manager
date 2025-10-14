'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Edit, Loader2 } from 'lucide-react';
import { INSIGHTS_THEME } from '@/components/ui/insightsTheme';
import { cn } from '@/lib/utils';

interface FeatureDiff {
  added: Array<{
    name: string;
    priority: string;
    risk: string;
  }>;
  modified: Array<{
    name: string;
    before: any;
    after: any;
  }>;
  removed: Array<{
    name: string;
    priority: string;
    risk: string;
  }>;
}

interface FeaturesDiffSummaryProps {
  projectId: string;
  currentVersionId: string;
  previousVersionId?: string;
}

export function FeaturesDiffSummary({
  projectId,
  currentVersionId,
  previousVersionId,
}: FeaturesDiffSummaryProps) {
  const [diff, setDiff] = useState<FeatureDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previousVersionId) return;

    const fetchDiff = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/projects/${projectId}/prd/${currentVersionId}/features/diff?compareTo=${previousVersionId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch feature diff');
        }

        const diffData = await response.json();
        setDiff(diffData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [projectId, currentVersionId, previousVersionId]);

  if (!previousVersionId) {
    return null;
  }

  if (loading) {
    return (
      <Card className={INSIGHTS_THEME.card}>
        <CardContent className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !diff) {
    return (
      <Card className={INSIGHTS_THEME.card}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {error || 'No diff data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { added, modified, removed } = diff;
  const totalChanges = added.length + modified.length + removed.length;

  if (totalChanges === 0) {
    return (
      <Card className={INSIGHTS_THEME.card}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Features: No changes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={INSIGHTS_THEME.card}>
      <CardHeader className="pb-2">
        <CardTitle className={INSIGHTS_THEME.subheading}>
          Features Changes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Features:</span>
            {added.length > 0 && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <Plus className="h-3 w-3 mr-1" />
                {added.length} added
              </Badge>
            )}
            {modified.length > 0 && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                <Edit className="h-3 w-3 mr-1" />
                {modified.length} modified
              </Badge>
            )}
            {removed.length > 0 && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                <Minus className="h-3 w-3 mr-1" />
                {removed.length} removed
              </Badge>
            )}
          </div>

          {/* Added features */}
          {added.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">
                Added ({added.length})
              </h4>
              <div className="space-y-1">
                {added.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Plus className="h-3 w-3 text-green-600" />
                    <span>{feature.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {feature.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {feature.risk}
                    </Badge>
                  </div>
                ))}
                {added.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{added.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Modified features */}
          {modified.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-2">
                Modified ({modified.length})
              </h4>
              <div className="space-y-1">
                {modified.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Edit className="h-3 w-3 text-blue-600" />
                    <span>{feature.name}</span>
                    <span className="text-xs text-muted-foreground">
                      (changes detected)
                    </span>
                  </div>
                ))}
                {modified.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{modified.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Removed features */}
          {removed.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                Removed ({removed.length})
              </h4>
              <div className="space-y-1">
                {removed.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Minus className="h-3 w-3 text-red-600" />
                    <span>{feature.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {feature.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {feature.risk}
                    </Badge>
                  </div>
                ))}
                {removed.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{removed.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
