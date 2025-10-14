'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  Target,
  GitCompare,
  AlertTriangle,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mapToInsightViewModel, InsightViewModel } from '@/lib/insights-mapper';
import { InsightsSummaryCards } from './insights/InsightsSummaryCards';
import { InsightsChangesList } from './insights/InsightsChangesList';
import { InsightsWorkflowSlim } from './insights/InsightsWorkflowSlim';
import { InsightsFeatures } from './insights/InsightsFeatures';
import { InsightsFeaturesDB } from './insights/InsightsFeaturesDB';
import { INSIGHTS_THEME } from '@/components/ui/insightsTheme';

interface InsightsPanelProps {
  projectId: string;
  selectedVersion: {
    id: string;
    title?: string;
    content_md?: string | null;
    summary_json?: any;
    created_at?: string | null;
  } | null;
  previousVersion?: {
    id: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

function InsightsContent({
  projectId,
  selectedVersion,
  previousVersion,
  isMobile = false,
}: {
  projectId: string;
  selectedVersion: InsightsPanelProps['selectedVersion'];
  previousVersion: InsightsPanelProps['previousVersion'];
  isMobile?: boolean;
}) {
  const [openSections, setOpenSections] = useState<string[]>(['summary']);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  if (!selectedVersion) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900">Insights</h2>
          <p className="text-xs text-gray-500 mt-1">버전을 선택하세요</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-gray-500 leading-relaxed">
            버전을 선택하면 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // Map data to InsightViewModel
  console.log('InsightsPanel selectedVersion:', selectedVersion);
  console.log(
    'InsightsPanel selectedVersion.summary_json:',
    selectedVersion.summary_json
  );
  const insightData = mapToInsightViewModel(selectedVersion);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-900">Insights</h2>
        <p className="text-xs text-gray-500 mt-1">v{selectedVersion.id}</p>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="space-y-4 p-6">
          {/* Summary & Highlights Card */}
          <Collapsible
            open={openSections.includes('summary')}
            onOpenChange={() => toggleSection('summary')}
          >
            <div className="bg-white rounded-xl ring-1 ring-gray-100/30 p-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900">
                    Summary & Highlights
                  </h3>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-600 transition-transform duration-150',
                    openSections.includes('summary') && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <InsightsSummaryCards data={insightData} />
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Changes Card */}
          <Collapsible
            open={openSections.includes('changes')}
            onOpenChange={() => toggleSection('changes')}
          >
            <div className="bg-white rounded-xl ring-1 ring-gray-100/30 p-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <GitCompare className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900">Changes</h3>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-600 transition-transform duration-150',
                    openSections.includes('changes') && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <InsightsChangesList
                  data={insightData}
                  projectId={projectId}
                  currentVersionId={selectedVersion?.id}
                  previousVersionId={previousVersion?.id}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Feature Metadata Card */}
          {selectedVersion && (
            <Collapsible
              open={openSections.includes('features')}
              onOpenChange={() => toggleSection('features')}
            >
              <div className="bg-white rounded-xl ring-1 ring-gray-100/30 p-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Feature Metadata
                    </h3>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-600 transition-transform duration-150',
                      openSections.includes('features') && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <InsightsFeaturesDB
                    projectId={projectId}
                    versionId={selectedVersion.id}
                    isMobile={isMobile}
                    features={selectedVersion.summary_json?.key_features || []}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Workflow & Scenarios Card */}
          <Collapsible
            open={openSections.includes('workflow')}
            onOpenChange={() => toggleSection('workflow')}
          >
            <div className="bg-white rounded-xl ring-1 ring-gray-100/30 p-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Link className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900">
                    Workflow & Scenarios
                  </h3>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-600 transition-transform duration-150',
                    openSections.includes('workflow') && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <InsightsWorkflowSlim data={insightData} />
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

export function InsightsPanel({
  projectId,
  selectedVersion,
  previousVersion,
  isOpen,
  onClose,
  isMobile = false,
}: InsightsPanelProps) {
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:w-96 overflow-hidden"
          aria-label="Insights Panel"
        >
          <InsightsContent
            projectId={projectId}
            selectedVersion={selectedVersion}
            previousVersion={previousVersion}
            isMobile={isMobile}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <InsightsContent
      projectId={projectId}
      selectedVersion={selectedVersion}
      previousVersion={previousVersion}
      isMobile={isMobile}
    />
  );
}
