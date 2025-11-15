'use client';

import { useState, useEffect } from 'react';
import type { TasksJson, Task } from '@taskmaker/core/types/tasks';
import { generateTasks, getTasksByVersion, saveTasks } from '@/lib/api/tasks';
import { TaskList } from './TaskList';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Copy, Check } from 'lucide-react';

interface TasksTabProps {
  projectId: string;
  prdVersionId: string | null;
  prdContentMd: string | null;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
}

export function TasksTab({
  projectId,
  prdVersionId,
  prdContentMd,
  selectedTaskId: externalSelectedTaskId,
  onTaskSelect,
  onTasksChange,
}: TasksTabProps) {
  const [savedTasks, setSavedTasks] = useState<TasksJson | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<TasksJson | null>(null);
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string | null>(null);
  
  // Use external selectedTaskId if provided, otherwise use internal state
  const selectedTaskId = externalSelectedTaskId !== undefined ? externalSelectedTaskId : internalSelectedTaskId;
  
  const handleTaskSelect = (taskId: string | null) => {
    if (onTaskSelect) {
      onTaskSelect(taskId);
    } else {
      setInternalSelectedTaskId(taskId);
    }
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load tasks when PRD version changes
  useEffect(() => {
    if (!prdVersionId) {
      setSavedTasks(null);
      setGeneratedTasks(null);
      setSelectedTaskId(null);
      return;
    }

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const tasks = await getTasksByVersion(projectId, prdVersionId);
        setSavedTasks(tasks);
        setGeneratedTasks(null); // Clear any unsaved generated tasks
        if (tasks && tasks.tasks.length > 0) {
          handleTaskSelect(tasks.tasks[0].id);
        } else {
          handleTaskSelect(null);
        }
      } catch (err) {
        console.error('Error loading tasks:', err);
        setError(
          err instanceof Error ? err.message : '작업 목록을 불러오는데 실패했습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [projectId, prdVersionId]);

  const handleGenerateTasks = async () => {
    if (!prdContentMd || !prdVersionId) {
      setError('PRD 내용이 없습니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const tasks = await generateTasks(prdContentMd);
      setGeneratedTasks(tasks);
      if (tasks.tasks.length > 0) {
        handleTaskSelect(tasks.tasks[0].id);
      }
    } catch (err) {
      console.error('Error generating tasks:', err);
      setError(
        err instanceof Error ? err.message : '작업 생성에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTasks = async () => {
    if (!generatedTasks || !prdVersionId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await saveTasks(projectId, prdVersionId, generatedTasks);
      // Reload tasks after saving
      const tasks = await getTasksByVersion(projectId, prdVersionId);
      setSavedTasks(tasks);
      setGeneratedTasks(null);
      if (tasks && tasks.tasks.length > 0) {
        handleTaskSelect(tasks.tasks[0].id);
      }
    } catch (err) {
      console.error('Error saving tasks:', err);
      setError(
        err instanceof Error ? err.message : '작업 저장에 실패했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    await handleGenerateTasks();
  };

  const handleCopy = async () => {
    if (!displayTasks) return;
    
    try {
      const tasksJson = JSON.stringify(displayTasks, null, 2);
      await navigator.clipboard.writeText(tasksJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('복사에 실패했습니다.');
    }
  };

  const handleDownload = () => {
    if (!displayTasks) return;
    
    try {
      const tasksJson = JSON.stringify(displayTasks, null, 2);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `tasks_${timestamp}.json`;
      
      const blob = new Blob([tasksJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download:', err);
      setError('다운로드에 실패했습니다.');
    }
  };

  // Determine which tasks to display
  const displayTasks = generatedTasks || savedTasks;
  
  // Notify parent when tasks change
  useEffect(() => {
    if (onTasksChange) {
      onTasksChange(displayTasks);
    }
  }, [displayTasks, onTasksChange]);

  if (!prdVersionId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-gray-500">PRD 버전을 선택해주세요.</p>
      </div>
    );
  }

  if (loading && !displayTasks) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header with actions */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">작업 목록</h2>
            {displayTasks && (
              <p className="text-sm text-gray-500 mt-1">
                {displayTasks.tasks.length}개의 작업
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {displayTasks && (
              <>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      복사
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  다운로드
                </Button>
              </>
            )}
            {!displayTasks && (
              <Button
                onClick={handleGenerateTasks}
                disabled={loading || !prdContentMd}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? '생성 중...' : '작업 생성'}
              </Button>
            )}
            {displayTasks && !generatedTasks && (
              <Button
                onClick={handleRegenerate}
                disabled={loading || !prdContentMd}
                variant="outline"
              >
                {loading ? '재생성 중...' : '재생성'}
              </Button>
            )}
            {generatedTasks && (
              <Button
                onClick={handleSaveTasks}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Main content area - Task list only */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {displayTasks && displayTasks.tasks.length > 0 ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <ScrollArea className="flex-1 h-0">
              <TaskList
                tasks={displayTasks.tasks}
                selectedId={selectedTaskId}
                onSelect={handleTaskSelect}
              />
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-gray-500">작업을 생성해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

