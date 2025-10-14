'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitCompare } from 'lucide-react';
import { InsightViewModel, TYPE_COLORS } from '@/lib/insights-mapper';
import { INSIGHTS_THEME } from '@/components/ui/insightsTheme';

interface InsightsChangesListProps {
  data: InsightViewModel;
  projectId?: string;
  currentVersionId?: string;
  previousVersionId?: string;
}

export function InsightsChangesList({
  data,
  projectId,
  currentVersionId,
  previousVersionId,
}: InsightsChangesListProps) {
  const changes = data.changes;

  return (
    <div data-testid="insights-changes">
      {changes.length > 0 ? (
        <div className="space-y-2">
          {changes.map((change, index) => (
            <div key={index} className="flex items-start gap-2">
              <Badge
                variant="outline"
                className={`${INSIGHTS_THEME.chip} ${TYPE_COLORS[change.type]}`}
              >
                {change.type === 'added'
                  ? 'Added'
                  : change.type === 'modified'
                    ? 'Modified'
                    : 'Removed'}
              </Badge>
              <span className="text-neutral-700 text-sm">{change.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-neutral-400 italic">No changes</p>
        </div>
      )}
    </div>
  );
}
