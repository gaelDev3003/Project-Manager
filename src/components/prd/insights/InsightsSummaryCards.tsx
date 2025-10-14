'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { InsightViewModel } from '@/lib/insights-mapper';
import { INSIGHTS_THEME } from '@/components/ui/insightsTheme';

interface InsightsSummaryCardsProps {
  data: InsightViewModel;
}

export function InsightsSummaryCards({ data }: InsightsSummaryCardsProps) {
  return (
    <div className="space-y-3" data-testid="insights-summary">
      {/* Core Focus */}
      <div className="flex items-start gap-3">
        <Target className="h-4 w-4 text-blue-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-neutral-900 mb-1">
            Core Focus
          </h4>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {data.coreFocus || (
              <span className="text-xs text-neutral-400 italic">
                None noted
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Key Risks */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-neutral-900 mb-1">
            Key Risks
          </h4>
          <div className="space-y-1">
            {data.keyRisks.length > 0 ? (
              data.keyRisks.map((risk, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs"
                  >
                    Risk
                  </Badge>
                  <span className="text-sm text-neutral-700">{risk}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-neutral-400 italic">
                None noted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-neutral-900 mb-1">
            Success Metrics
          </h4>
          <div className="space-y-1">
            {data.successMetrics.length > 0 ? (
              data.successMetrics.map((metric, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"
                  >
                    KPI
                  </Badge>
                  <span className="text-sm text-neutral-700">{metric}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-neutral-400 italic">
                None noted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
