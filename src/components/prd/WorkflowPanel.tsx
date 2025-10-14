'use client';

import { useMemo, useState } from 'react';

interface WorkflowPanelProps {
  summaryJson: any;
  mermaidCode?: string | null;
}

export default function WorkflowPanel({
  summaryJson,
  mermaidCode,
}: WorkflowPanelProps) {
  const [activeTab, setActiveTab] = useState<'workflow' | 'summary'>(
    'workflow'
  );

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const compactSummary = useMemo(() => {
    const s = summaryJson || {};
    return {
      sections: s.sections || [],
      kpi: s.kpi || [],
      risks: s.risks || [],
      endpoints: s.endpoints || [],
    };
  }, [summaryJson]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['workflow', 'summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === t
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {t === 'workflow' ? 'Workflow' : 'Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'workflow' ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 italic">
            Diagram rendering disabled in this build. Showing source only.
          </div>
          <div className="border border-gray-200 rounded p-2 overflow-auto">
            {mermaidCode ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">
                    Mermaid Source
                  </span>
                  <button
                    onClick={() => copyToClipboard(mermaidCode)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded overflow-auto">
                  <code>{mermaidCode}</code>
                </pre>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Mermaid 다이어그램이 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs text-gray-800">
          <div>
            <div className="font-medium text-gray-900 mb-1">Sections</div>
            <ul className="list-disc list-inside">
              {compactSummary.sections.map((x: any, i: number) => (
                <li key={i}>{String(x)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">KPI</div>
            <ul className="list-disc list-inside">
              {compactSummary.kpi.map((x: any, i: number) => (
                <li key={i}>{String(x)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Risks</div>
            <ul className="list-disc list-inside">
              {compactSummary.risks.map((x: any, i: number) => (
                <li key={i}>{String(x)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Endpoints</div>
            <ul className="list-disc list-inside">
              {compactSummary.endpoints.map((x: any, i: number) => (
                <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
