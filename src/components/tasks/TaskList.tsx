'use client';

import type { Task } from '@taskmaker/core/types/tasks';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TaskList({ tasks, selectedId, onSelect }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-gray-500">작업이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-4">
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onSelect(task.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-colors',
            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            selectedId === task.id
              ? 'bg-indigo-50 border border-indigo-200'
              : 'bg-white border border-gray-200'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500">
                  {task.id}
                </span>
                {task.metadata?.priority && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      task.metadata.priority === 'P0' && 'bg-red-100 text-red-700',
                      task.metadata.priority === 'P1' && 'bg-orange-100 text-orange-700',
                      task.metadata.priority === 'P2' && 'bg-yellow-100 text-yellow-700',
                      task.metadata.priority === 'P3' && 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {task.metadata.priority}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {task.title}
              </h4>
              {task.steps && task.steps.length > 0 && (
                <p className="text-xs text-gray-500">
                  {task.steps.length}개 단계
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

