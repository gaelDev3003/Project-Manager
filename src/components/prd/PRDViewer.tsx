'use client';

import { useState } from 'react';
import { PRDResponse } from '@/types/prd';

interface PRDViewerProps {
  prd: PRDResponse | any; // PRDVersion의 summary_json도 받을 수 있도록 수정
  isEmbedded?: boolean;
}

export default function PRDViewer({ prd, isEmbedded = false }: PRDViewerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!prd) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          PRD 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadPRD = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    let prdText = `# PRD (Product Requirements Document)
생성일: ${timestamp}

## 📋 요약
${prd.summary || prd.goal || '요약이 없습니다'}

## 🎯 목표
${prd.goals?.map((goal: string) => `- ${goal}`).join('\n') || prd.goal ? `- ${prd.goal}` : '- 목표가 없습니다'}

## ⭐ 주요 기능
${prd.key_features?.map((feature: any) => `- **${feature.name}**: ${feature.description || feature.notes || ''} (우선순위: ${feature.priority || 'N/A'}, 위험도: ${feature.risk || 'N/A'}, 노력: ${feature.effort || 'N/A'})`).join('\n') || prd.features?.map((feature: any) => `- ${feature.name}`).join('\n') || '- 기능이 없습니다'}

## 🚫 범위 밖 기능
${prd.out_of_scope?.map((item: string) => `- ${item}`).join('\n') || '- 없습니다'}

## ⚠️ 위험 요소
${prd.risks?.map((risk: string) => `- ${risk}`).join('\n') || prd.risk ? `- ${prd.risk}` : '- 없습니다'}

## ✅ 수용 기준
${prd.acceptance?.map((criteria: string) => `- ${criteria}`).join('\n') || '- 없습니다'}
`;

    // Add API endpoints if available
    if (prd.api_endpoints && prd.api_endpoints.length > 0) {
      prdText += `\n## 🔌 API 엔드포인트

${prd.api_endpoints
  .map(
    (endpoint: any) => `### ${endpoint.method} ${endpoint.path}
**설명:** ${endpoint.description}
**인증 필요:** ${endpoint.auth_required ? '예' : '아니오'}

**에러 코드:**
${Object.entries(endpoint.error_codes || {})
  .map(([code, message]) => `- ${code}: ${message}`)
  .join('\n')}
`
  )
  .join('\n')}
`;
    }

    // Add technical requirements if available
    if (prd.technical_requirements) {
      prdText += `\n## 🛠️ 기술 요구사항

### 프론트엔드
${prd.technical_requirements.frontend?.map((tech: string) => `- ${tech}`).join('\n') || '- 없음'}

### 백엔드
${prd.technical_requirements.backend?.map((tech: string) => `- ${tech}`).join('\n') || '- 없음'}

### 데이터베이스
${prd.technical_requirements.database?.map((tech: string) => `- ${tech}`).join('\n') || '- 없음'}

### 인프라
${prd.technical_requirements.infrastructure?.map((tech: string) => `- ${tech}`).join('\n') || '- 없음'}
`;
    }

    // Add implementation phases if available
    if (prd.implementation_phases && prd.implementation_phases.length > 0) {
      prdText += `\n## 📅 구현 단계

${prd.implementation_phases
  .map(
    (phase: any, index: number) => `### ${index + 1}. ${phase.phase}
**예상 시간:** ${phase.estimated_hours}시간

**작업 내용:**
${phase.tasks.map((task: string) => `- ${task}`).join('\n')}

**승인 기준:**
${phase.acceptance_criteria.map((criteria: string) => `- ${criteria}`).join('\n')}
`
  )
  .join('\n')}
`;
    }

    // Add database schema if available
    if (
      prd.database_schema &&
      prd.database_schema.tables &&
      prd.database_schema.tables.length > 0
    ) {
      prdText += `\n## 🗄️ 데이터베이스 스키마

${prd.database_schema.tables
  .map(
    (table: any) => `### 테이블: \`${table.name}\`

**SQL:**
\`\`\`sql
${table.sql}
\`\`\`

**인덱스:**
${table.indexes.map((index: string) => `- \`${index}\``).join('\n')}

**RLS 정책:**
\`\`\`sql
${table.rls_policy}
\`\`\`
`
  )
  .join('\n')}
`;
    }

    const blob = new Blob([prdText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prd-${timestamp}.md`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={isEmbedded ? 'p-6' : 'bg-white shadow-sm rounded-lg p-6'}>
      {!isEmbedded && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">PRD 문서</h3>
          <div className="flex space-x-2">
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(prd, null, 2), 'json')
              }
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {copied === 'json' ? '복사됨!' : 'JSON 복사'}
            </button>
            <button
              onClick={downloadPRD}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              다운로드
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">요약</h4>
          <p className="text-gray-700 leading-relaxed">
            {prd.summary || prd.goal || '요약이 없습니다'}
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">목표</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
            {prd.goals && Array.isArray(prd.goals) && prd.goals.length > 0 ? (
              prd.goals.map((goal: string, index: number) => (
                <li key={index}>{goal}</li>
              ))
            ) : prd.goal ? (
              <li>{prd.goal}</li>
            ) : (
              <li>목표가 없습니다</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">주요 기능</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
            {prd.key_features?.map((feature: any, index: number) => (
              <li key={index}>
                <strong>{feature.name}</strong>:{' '}
                {feature.description || feature.notes || ''}
                (우선순위: {feature.priority || 'N/A'}, 위험도:{' '}
                {feature.risk || 'N/A'}, 노력: {feature.effort || 'N/A'})
              </li>
            )) ||
              prd.features?.map((feature: any, index: number) => (
                <li key={index}>{feature.name}</li>
              )) || <li>기능이 없습니다</li>}
          </ul>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-2">
            범위 밖 기능
          </h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {prd.out_of_scope?.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            )) || <li>없습니다</li>}
          </ul>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-2">위험 요소</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {prd.risks?.map((risk: string, index: number) => (
              <li key={index}>{risk}</li>
            )) || prd.risk ? (
              <li>{prd.risk}</li>
            ) : (
              <li>없습니다</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-2">수용 기준</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {prd.acceptance_criteria &&
            Array.isArray(prd.acceptance_criteria) &&
            prd.acceptance_criteria.length > 0 ? (
              prd.acceptance_criteria.map((criteria: string, index: number) => (
                <li key={index}>{criteria}</li>
              ))
            ) : prd.acceptance &&
              Array.isArray(prd.acceptance) &&
              prd.acceptance.length > 0 ? (
              prd.acceptance.map((criteria: string, index: number) => (
                <li key={index}>{criteria}</li>
              ))
            ) : (
              <li>없습니다</li>
            )}
          </ul>
        </div>

        {/* Technical Requirements */}
        {prd.technical_requirements && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">
              🛠️ 기술 요구사항
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prd.technical_requirements.frontend && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                    프론트엔드
                  </h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                    {prd.technical_requirements.frontend.map(
                      (tech: string, index: number) => (
                        <li key={index}>{tech}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {prd.technical_requirements.backend && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                    백엔드
                  </h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                    {prd.technical_requirements.backend.map(
                      (tech: string, index: number) => (
                        <li key={index}>{tech}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {prd.technical_requirements.database && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                    데이터베이스
                  </h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                    {prd.technical_requirements.database.map(
                      (tech: string, index: number) => (
                        <li key={index}>{tech}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {prd.technical_requirements.infrastructure && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                    인프라
                  </h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                    {prd.technical_requirements.infrastructure.map(
                      (tech: string, index: number) => (
                        <li key={index}>{tech}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Implementation Phases */}
        {prd.implementation_phases && prd.implementation_phases.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">
              📅 구현 단계
            </h4>
            <div className="space-y-4">
              {prd.implementation_phases.map((phase: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h5 className="text-sm font-medium text-gray-900 mb-1">
                    {index + 1}. {phase.phase}
                  </h5>
                  <p className="text-xs text-gray-600 mb-2">
                    예상 시간: {phase.estimated_hours}시간
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    {phase.tasks.map((task: string, taskIndex: number) => (
                      <li key={taskIndex}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Endpoints */}
        {prd.api_endpoints && prd.api_endpoints.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">
              🔌 API 엔드포인트
            </h4>
            <div className="space-y-4">
              {prd.api_endpoints.map((endpoint: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        endpoint.method === 'GET'
                          ? 'bg-green-100 text-green-800'
                          : endpoint.method === 'POST'
                            ? 'bg-blue-100 text-blue-800'
                            : endpoint.method === 'PUT'
                              ? 'bg-yellow-100 text-yellow-800'
                              : endpoint.method === 'DELETE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    {endpoint.auth_required && (
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                        Auth Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {endpoint.description}
                  </p>
                  {endpoint.error_codes &&
                    Object.keys(endpoint.error_codes).length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-700 mb-1">
                          에러 코드:
                        </h6>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(endpoint.error_codes).map(
                            ([code, message]) => (
                              <span
                                key={code}
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded"
                              >
                                {code}: {String(message)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Schema */}
        {prd.database_schema &&
          prd.database_schema.tables &&
          prd.database_schema.tables.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">
                🗄️ 데이터베이스 스키마
              </h4>
              <div className="space-y-4">
                {prd.database_schema.tables.map((table: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      테이블:{' '}
                      <code className="bg-gray-100 px-1 rounded">
                        {table.name}
                      </code>
                    </h5>
                    <div className="mb-2">
                      <h6 className="text-xs font-medium text-gray-700 mb-1">
                        SQL:
                      </h6>
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        <code>{table.sql}</code>
                      </pre>
                    </div>
                    {table.indexes && table.indexes.length > 0 && (
                      <div className="mb-2">
                        <h6 className="text-xs font-medium text-gray-700 mb-1">
                          인덱스:
                        </h6>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                          {table.indexes.map(
                            (index: string, idxIndex: number) => (
                              <li key={idxIndex}>
                                <code>{index}</code>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {table.rls_policy && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-700 mb-1">
                          RLS 정책:
                        </h6>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          <code>{table.rls_policy}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
