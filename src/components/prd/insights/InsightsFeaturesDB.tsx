'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';
import { PRIORITY_COLORS } from '@/lib/insights-mapper';
import {
  INSIGHTS_THEME,
  IMPACT_COLORS as THEME_IMPACT_COLORS,
} from '@/components/ui/insightsTheme';
import { cn } from '@/lib/utils';

interface InsightsFeaturesDBProps {
  projectId: string;
  versionId: string;
  isMobile?: boolean;
  features?: any[]; // PRD의 key_features 데이터를 직접 전달
}

export function InsightsFeaturesDB({
  projectId,
  versionId,
  isMobile = false,
  features = [],
}: InsightsFeaturesDBProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAllModal) {
        setShowAllModal(false);
      }
    };

    if (showAllModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showAllModal]);

  // 사용자 친화적인 Feature Card
  const FeatureCard = ({ feature }: { feature: any }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm">{feature.name}</h4>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${PRIORITY_COLORS[feature.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-600'}`}
          >
            {feature.priority || 'N/A'}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${PRIORITY_COLORS[feature.risk as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-600'}`}
          >
            {feature.risk || 'N/A'}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${PRIORITY_COLORS[feature.effort as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-600'}`}
          >
            {feature.effort || 'N/A'}
          </Badge>
        </div>
      </div>

      {feature.notes && (
        <p className="text-sm text-gray-600 mb-3">{feature.notes}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {feature.tags?.map((tag: string, index: number) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="space-y-2">
        {feature.impacts && feature.impacts.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500">
              영향 대상:
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {feature.impacts.map((impact: string, index: number) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`text-xs ${THEME_IMPACT_COLORS[impact as keyof typeof THEME_IMPACT_COLORS] || 'bg-gray-100 text-gray-600'}`}
                >
                  {impact}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {feature.dependencies && feature.dependencies.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500">의존성:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {feature.dependencies.map((dep: string, index: number) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                >
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!features || features.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">기능 메타데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div data-testid="insights-features-db">
      <div className="space-y-3">
        {features.slice(0, 3).map((feature: any, index: number) => (
          <FeatureCard key={index} feature={feature} />
        ))}
        
        {features.length > 3 && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllModal(true)}
              className="w-full"
              data-testid="view-all-features"
            >
              <Eye className="h-4 w-4 mr-2" />
              모든 기능 보기 ({features.length}개)
            </Button>
          </div>
        )}
      </div>

      {/* Portal Modal for View All */}
      {showAllModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          data-testid="features-modal"
          onClick={() => setShowAllModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">모든 기능 ({features.length}개)</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="닫기"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {features.map((feature: any, index: number) => (
                  <FeatureCard key={index} feature={feature} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
