'use client';

import { useMemo, useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import PRDViewer from './PRDViewer';

export interface PRDVersion {
  id: string;
  project_prd_id: string;
  version: number;
  status: string;
  content_md?: string | null;
  summary_json?: any;
  diagram_mermaid?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

interface VersionListProps {
  versions: PRDVersion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onViewFullPrd?: (version: PRDVersion) => void;
}

export default function VersionList({
  versions,
  selectedId,
  onSelect,
  onViewFullPrd,
}: VersionListProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...(versions || [])].sort((a, b) => (b.version || 0) - (a.version || 0)),
    [versions]
  );

  // 선택된 버전이 변경될 때 자동으로 PRD 전문 표시
  useEffect(() => {
    if (selectedId) {
      setExpandedVersion(selectedId);
    } else {
      // selectedId가 null이면 expandedVersion도 null로 설정
      setExpandedVersion(null);
    }
  }, [selectedId]);

  const handleVersionClick = (versionId: string) => {
    if (selectedId === versionId) {
      // 이미 선택된 버전을 클릭하면 토글
      setExpandedVersion(expandedVersion === versionId ? null : versionId);
    } else {
      // 다른 버전을 클릭하면 선택하고 PRD 전문 표시
      onSelect(versionId);
      setExpandedVersion(versionId);
    }
  };

  if (!versions || versions.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        아직 버전이 없습니다. 피드백을 적용해 새 버전을 만들어 보세요.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedId && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 pb-2 mb-4">
          <button
            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors duration-150 flex items-center gap-1"
            onClick={() => {
              // 먼저 expandedVersion을 null로 설정
              setExpandedVersion(null);
              // 그 다음 selectedId를 null로 설정하여 목록 뷰로 전환
              onSelect(null);
            }}
          >
            <span>←</span>
            <span>목록으로</span>
          </button>
        </div>
      )}

      {selectedId ? (
        // 선택된 버전이 있을 때는 해당 버전만 표시
        <div className="space-y-2">
          {sorted
            .filter((v) => v.id === selectedId)
            .map((v) => (
              <div
                key={v.id}
                className="border border-gray-100 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="px-4 py-3 bg-indigo-50/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      v{v.version}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v.created_at
                        ? new Date(v.created_at).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">{v.status}</div>
                    {onViewFullPrd && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onViewFullPrd(v)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Full PRD
                      </Button>
                    )}
                  </div>
                </div>

                {/* PRD 전문 표시 */}
                <div className="px-4 py-4 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-gray-700">
                      PRD 전문
                    </div>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() =>
                        setExpandedVersion(
                          expandedVersion === v.id ? null : v.id
                        )
                      }
                    >
                      {expandedVersion === v.id ? '접기' : '펼치기'}
                    </button>
                  </div>
                  {expandedVersion === v.id && (
                    <div className="max-h-96 overflow-y-auto text-xs bg-white rounded border p-3">
                      {v.content_md &&
                      !v.content_md.includes(
                        'This is a fallback response due to JSON parsing issues'
                      ) ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              marked.parse(v.content_md) as string
                            ),
                          }}
                        />
                      ) : v.summary_json ? (
                        <PRDViewer prd={v.summary_json} />
                      ) : (
                        <div className="text-gray-500 text-center py-4">
                          내용이 없습니다.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        // 선택된 버전이 없을 때는 모든 버전 리스트 표시
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
          {sorted.map((v) => (
            <li key={v.id}>
              <div
                className="px-4 py-3 cursor-pointer bg-white hover:bg-gray-50/80 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                onClick={() => handleVersionClick(v.id)}
                tabIndex={0}
                role="button"
                aria-label={`버전 ${v.version} 선택`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleVersionClick(v.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">
                    v{v.version}
                  </div>
                  <div className="text-xs text-gray-500">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleString()
                      : ''}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">{v.status}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
