'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, getClientAuthHeaders } from '@/lib/supabase';
import PRDGenerator from '@/components/prd/PRDGenerator';
import PRDViewer from '@/components/prd/PRDViewer';
import VersionList, { PRDVersion } from '@/components/prd/VersionList';
import WorkflowPanel from '@/components/prd/WorkflowPanel';
import ChatPanel from '@/components/prd/ChatPanel';
import { InsightsPanel } from '@/components/prd/InsightsPanel';
import { TopToolbar } from '@/components/prd/TopToolbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PRDResponse } from '@/types/prd';
import { FullPrdSheet } from '@/components/prd/FullPrdSheet';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [prd, setPrd] = useState<PRDResponse | null>(null);
  const [versions, setVersions] = useState<PRDVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [selectedVersion, setSelectedVersion] = useState<PRDVersion | null>(
    null
  );
  const [prevVersion, setPrevVersion] = useState<PRDVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [fullPrdOpen, setFullPrdOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userClickedBackToList, setUserClickedBackToList] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // 데스크톱에서는 패널들을 열린 상태로 설정
      if (!mobile) {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // URL 상태 관리
  useEffect(() => {
    const versionId = searchParams.get('version');
    if (versionId && versions.length > 0) {
      setSelectedVersionId(versionId);
      fetchVersion(versionId);
      setUserClickedBackToList(false); // URL에서 버전이 선택되면 플래그 리셋
    } else if (
      versions.length > 0 &&
      !selectedVersionId &&
      !userClickedBackToList
    ) {
      // 가장 최신 버전 선택 (사용자가 목록으로 돌아가기를 클릭하지 않은 경우에만)
      const latestVersion = versions[0];
      setSelectedVersionId(latestVersion.id);
      fetchVersion(latestVersion.id);
    }
  }, [versions, searchParams, selectedVersionId, userClickedBackToList]);

  // versions가 업데이트될 때 selectedVersion도 업데이트
  useEffect(() => {
    if (versions.length > 0 && selectedVersionId) {
      const version = versions.find((v) => v.id === selectedVersionId);
      if (version) {
        setSelectedVersion(version);
      }
    }
  }, [versions, selectedVersionId]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchProject();
        fetchPRD();
        fetchVersions();
      } else {
        router.push('/auth/login');
      }
    }
  }, [user, authLoading, params.id, router]);

  const fetchProject = async () => {
    try {
      const authHeaders = await getClientAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const response = await fetch(`/api/projects/${params.id}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          setError('프로젝트를 찾을 수 없습니다.');
        } else {
          throw new Error('Failed to fetch project');
        }
        return;
      }

      const { project } = await response.json();
      setProject(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchPRD = async () => {
    try {
      const authHeaders = await getClientAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const response = await fetch(`/api/projects/${params.id}/prd`, {
        headers,
      });
      if (response.ok) {
        const prdData = await response.json();
        setPrd(prdData);
      }
    } catch (err) {
      console.error('Error fetching PRD:', err);
    }
  };

  const fetchVersions = async () => {
    try {
      const authHeaders = await getClientAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const res = await fetch(`/api/projects/${params.id}/prd/versions`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const list: PRDVersion[] = data.versions || [];
        setVersions(list);
      }
    } catch (e) {}
  };

  const fetchVersion = async (vid: string) => {
    try {
      const authHeaders = await getClientAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const res = await fetch(
        `/api/projects/${params.id}/prd/versions/${vid}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedVersion(data.version);
        const idx = versions.findIndex((v) => v.id === vid);
        if (idx >= 0 && idx < versions.length - 1)
          setPrevVersion(versions[idx + 1]);
        else setPrevVersion(null);
      }
    } catch (e) {}
  };

  const handlePRDGenerated = () => {
    fetchPRD();
  };

  const handleVersionSelect = (versionId: string | null) => {
    setSelectedVersionId(versionId);
    if (versionId) {
      fetchVersion(versionId);
      setUserClickedBackToList(false); // 버전 선택 시 플래그 리셋
      // URL 업데이트
      const url = new URL(window.location.href);
      url.searchParams.set('version', versionId);
      router.replace(url.pathname + url.search);
    } else {
      // 목록으로 돌아가기 - 플래그 설정
      setUserClickedBackToList(true);
      // URL에서 version 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('version');
      router.replace(url.pathname + url.search);
    }
  };

  const handleViewFullPrd = (version: PRDVersion) => {
    setFullPrdOpen(true);
  };

  const handleFeedbackSubmit = async (feedback: string) => {
    try {
      // 낙관적 업데이트: 임시 버전 추가
      const tempVersion: PRDVersion = {
        id: `temp-${Date.now()}`,
        project_prd_id: '',
        version: (versions[0]?.version || 0) + 1,
        status: 'draft',
        content_md: null,
        summary_json: null,
        diagram_mermaid: null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
      };

      setVersions((prev) => [tempVersion, ...prev]);
      setSelectedVersionId(tempVersion.id);

      // URL 업데이트
      const url = new URL(window.location.href);
      url.searchParams.set('version', tempVersion.id);
      router.replace(url.pathname + url.search);

      // 서버에 피드백 제출
      const authHeaders = await getClientAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };

      const response = await fetch(
        `/api/projects/${params.id}/prd/apply-feedback`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            versionId: selectedVersionId,
            message: feedback,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 서버 응답으로 임시 버전 교체
        setVersions((prev) =>
          prev.map((v) => (v.id === tempVersion.id ? data.version : v))
        );
        setSelectedVersionId(data.version.id);

        // URL 업데이트
        const url = new URL(window.location.href);
        url.searchParams.set('version', data.version.id);
        router.replace(url.pathname + url.search);
      } else {
        // 실패 시 롤백
        setVersions((prev) => prev.filter((v) => v.id !== tempVersion.id));
        setSelectedVersionId(versions[0]?.id || null);
        throw new Error('피드백 적용에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // 에러 시 롤백
      setVersions((prev) => prev.filter((v) => !v.id.startsWith('temp-')));
      setSelectedVersionId(versions[0]?.id || null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setPageLoading(false);
  }, [project, error]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 text-indigo-600 hover:text-indigo-800 underline"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <TopToolbar
        leftOpen={leftPanelOpen}
        rightOpen={rightPanelOpen}
        onLeftToggle={() => setLeftPanelOpen(!leftPanelOpen)}
        onRightToggle={() => setRightPanelOpen(!rightPanelOpen)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Version List */}
        {isMobile ? (
          <Sheet open={leftPanelOpen} onOpenChange={setLeftPanelOpen}>
            <SheetContent side="left" className="w-full p-0 sm:w-80">
              <div className="h-full flex flex-col">
                <div className="border-b border-gray-100 p-6">
                  <h3 className="text-sm font-medium text-gray-900">
                    Versions
                  </h3>
                  <button
                    className="text-xs text-indigo-600 hover:text-indigo-500 mt-2 transition-colors"
                    onClick={() => fetchVersions()}
                  >
                    새로고침
                  </button>
                </div>
                <ScrollArea className="flex-1 h-0">
                  <div className="p-6">
                    <VersionList
                      versions={versions}
                      selectedId={selectedVersionId}
                      onSelect={handleVersionSelect}
                      onViewFullPrd={handleViewFullPrd}
                    />
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <aside
            id="version-sidebar"
            className="w-80 border-r border-gray-100 bg-white"
          >
            <div className="h-full flex flex-col">
              <div className="border-b border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-900">Versions</h3>
                <button
                  className="text-xs text-indigo-600 hover:text-indigo-500 mt-2 transition-colors"
                  onClick={() => fetchVersions()}
                >
                  새로고침
                </button>
              </div>
              <ScrollArea className="flex-1 h-0">
                <div className="p-6">
                  <VersionList
                    versions={versions}
                    selectedId={selectedVersionId}
                    onSelect={handleVersionSelect}
                    onViewFullPrd={handleViewFullPrd}
                  />
                </div>
              </ScrollArea>
            </div>
          </aside>
        )}

        {/* CENTER PANEL - Chat & Feedback */}
        <main className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 h-0">
            <div className="p-6">
              <ChatPanel
                projectId={params.id}
                onPRDFinalized={() => {
                  // PRD가 완료되면 버전 목록을 새로고침
                  fetchVersions();
                }}
                selectedVersion={
                  selectedVersion
                    ? {
                        id: selectedVersion.id,
                        title: `PRD v${selectedVersion.version}`,
                        date:
                          selectedVersion.created_at ||
                          new Date().toISOString(),
                      }
                    : undefined
                }
              />
            </div>
          </ScrollArea>
        </main>

        {/* RIGHT PANEL - Insights */}
        {isMobile ? (
          <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
            <SheetContent side="right" className="w-full p-0 sm:w-96">
              <InsightsPanel
                projectId={params.id}
                selectedVersion={selectedVersion}
                previousVersion={prevVersion}
                isOpen={rightPanelOpen}
                onClose={() => setRightPanelOpen(false)}
                isMobile={true}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <div className="w-96 border-l border-gray-100 bg-white">
            <InsightsPanel
              projectId={params.id}
              selectedVersion={selectedVersion}
              previousVersion={prevVersion}
              isOpen={rightPanelOpen}
              onClose={() => setRightPanelOpen(false)}
              isMobile={false}
            />
          </div>
        )}
      </div>

      {/* Full PRD Sheet/Modal */}
      {selectedVersion && (
        <FullPrdSheet
          version={{
            id: selectedVersion.id,
            title: `PRD v${selectedVersion.version}`,
            date: selectedVersion.created_at || new Date().toISOString(),
            status: selectedVersion.status,
            content_md: selectedVersion.content_md,
            summary_json: selectedVersion.summary_json,
          }}
          open={fullPrdOpen}
          onOpenChange={setFullPrdOpen}
        />
      )}
    </div>
  );
}
