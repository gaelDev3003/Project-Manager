'use client';

import type { Task } from '@taskmaker/core/types/tasks';
import { Badge } from '@/components/ui/badge';

interface TaskDetailProps {
  task: Task | null;
}

export function TaskDetail({ task }: TaskDetailProps) {
  if (!task) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            작업을 선택하면 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {task.title}
        </h2>
        {task.description && (
          <p className="text-gray-600">{task.description}</p>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">태그</h3>
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag, index) => (
              <Badge
                key={index}
                variant={
                  tag.startsWith('role:') || tag.startsWith('domain:')
                    ? 'default'
                    : 'outline'
                }
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      {task.details && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">구현 상세</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {task.details}
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      {task.steps && task.steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            단계 ({task.steps.length})
          </h3>
          <ol className="space-y-2">
            {task.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700 flex-1 pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Test Strategy */}
      {task.testStrategy && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">테스트 전략</h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {task.testStrategy}
            </p>
          </div>
        </div>
      )}

      {/* Metadata */}
      {task.metadata && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">메타데이터</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">우선순위:</span>{' '}
              <span className="font-medium">{task.metadata.priority}</span>
            </div>
            <div>
              <span className="text-gray-500">위험도:</span>{' '}
              <span className="font-medium">{task.metadata.risk}</span>
            </div>
            <div>
              <span className="text-gray-500">예상 시간:</span>{' '}
              <span className="font-medium">{task.metadata.effort_hours}시간</span>
            </div>
            <div>
              <span className="text-gray-500">역할:</span>{' '}
              <span className="font-medium">{task.metadata.role}</span>
            </div>
            <div>
              <span className="text-gray-500">상태:</span>{' '}
              <span className="font-medium">{task.metadata.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dependencies */}
      {task.deps && task.deps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">의존성</h3>
          <div className="flex flex-wrap gap-2">
            {task.deps.map((dep, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {dep}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

