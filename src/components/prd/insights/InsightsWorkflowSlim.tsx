'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, FileText } from 'lucide-react';
import { InsightViewModel } from '@/lib/insights-mapper';
import { INSIGHTS_THEME } from '@/components/ui/insightsTheme';

interface InsightsWorkflowSlimProps {
  data: InsightViewModel;
  onOpenFullPRD?: () => void;
}

export function InsightsWorkflowSlim({
  data,
  onOpenFullPRD,
}: InsightsWorkflowSlimProps) {
  const { scenarios, previewMd } = data;
  const hasScenarios = scenarios.length > 0;
  const hasPreview = previewMd.trim().length > 0;

  return (
    <div data-testid="insights-workflow" className="space-y-3">
      {/* Scenarios */}
      <div>
        <h4 className="text-sm font-medium text-neutral-900 mb-2">
          User Scenarios
        </h4>
        {hasScenarios ? (
          <div className="space-y-1">
            {scenarios.map((scenario, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-xs text-neutral-500 mt-1">
                  {index + 1}.
                </span>
                <span className="text-sm text-neutral-700">{scenario}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-neutral-400 italic mb-2">
              No user journey yet.
            </p>
            <Button variant="outline" size="sm" className="text-xs">
              Generate from PRD or add manually
            </Button>
          </div>
        )}
      </div>

      {/* PRD Preview */}
      {hasPreview && (
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-2">
            PRD Preview
          </h4>
          <div className="bg-neutral-50 p-3 rounded-md max-h-40 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono text-neutral-700">
              {previewMd}
            </pre>
          </div>
          {onOpenFullPRD && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-500 h-auto p-0 mt-2"
              onClick={onOpenFullPRD}
            >
              <FileText className="h-3 w-3 mr-1" />
              Open Full PRD
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
