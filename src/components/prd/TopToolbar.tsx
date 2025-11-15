'use client';

import { Button } from '@/components/ui/button';
import {
  PanelLeft,
  PanelRight,
  Download,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';
import { ProjectNav } from '@/components/navigation/ProjectNav';
import Link from 'next/link';

interface TopToolbarProps {
  leftOpen: boolean;
  rightOpen: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  isMobile?: boolean;
  currentProjectId?: string;
  currentProjectName?: string;
  showRightPanel?: boolean;
}

export function TopToolbar({
  leftOpen,
  rightOpen,
  onLeftToggle,
  onRightToggle,
  isMobile = false,
  currentProjectId,
  currentProjectName,
  showRightPanel = true,
}: TopToolbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeftToggle}
          aria-expanded={leftOpen}
          aria-controls="version-sidebar"
          aria-label="Toggle version list"
          className="h-8 w-8 hover:bg-gray-50"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Navigation Section */}
        <div className="flex items-center space-x-4">
          {/* Back to Dashboard */}
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">대시보드</span>
            </Button>
          </Link>

          {/* Project Navigation */}
          <ProjectNav
            currentProjectId={currentProjectId}
            className="hidden md:block"
          />

          {/* Breadcrumb for mobile */}
          {isMobile && currentProjectName && (
            <BreadcrumbNav
              items={[
                { label: '프로젝트', href: '/dashboard' },
                { label: currentProjectName },
              ]}
              className="md:hidden"
            />
          )}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-gray-900 ml-4">
          PRD Manager
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {showRightPanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRightToggle}
            aria-expanded={rightOpen}
            aria-controls="insights-panel"
            aria-label="Toggle insights panel"
            className="h-8 w-8 hover:bg-gray-50"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
