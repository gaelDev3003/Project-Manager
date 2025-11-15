import { getClientAuthHeaders } from '@/lib/supabase';
import type { TasksJson } from '@taskmaker/core/types/tasks';

/**
 * Generate tasks from PRD text using the task generation API
 * @param prdText - The PRD content in markdown format
 * @returns Promise resolving to validated TasksJson
 * @throws Error if generation fails (429 rate limit, 400 validation, 500 server error)
 */
export async function generateTasks(prdText: string): Promise<TasksJson> {
  const headers = await getClientAuthHeaders();
  const response = await fetch('/api/tasks/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ prdText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Unknown error',
    }));

    if (response.status === 429) {
      throw new Error(
        '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      );
    }

    if (response.status === 400) {
      throw new Error(
        errorData.error || '잘못된 요청입니다. PRD 텍스트를 확인해주세요.'
      );
    }

    if (response.status === 500) {
      throw new Error(
        errorData.error || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    }

    throw new Error(errorData.error || `Failed to generate tasks: ${response.status}`);
  }

  const data = await response.json();
  return data.tasks;
}

/**
 * Get tasks for a specific project and PRD version
 * @param projectId - UUID of the project
 * @param prdVersionId - UUID of the PRD version
 * @returns Promise resolving to TasksJson or null if no tasks exist
 * @throws Error if fetch fails
 */
export async function getTasksByVersion(
  projectId: string,
  prdVersionId: string
): Promise<TasksJson | null> {
  const headers = await getClientAuthHeaders();
  const response = await fetch('/api/tasks/by-version', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ projectId, prdVersionId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Unknown error',
    }));

    if (response.status === 401) {
      throw new Error('인증이 필요합니다.');
    }

    if (response.status === 404) {
      // Project or version not found - return null instead of throwing
      return null;
    }

    throw new Error(
      errorData.error || `Failed to fetch tasks: ${response.status}`
    );
  }

  const data = await response.json();
  return data.tasks;
}

/**
 * Save tasks for a specific project and PRD version
 * @param projectId - UUID of the project
 * @param prdVersionId - UUID of the PRD version
 * @param tasks - Validated TasksJson to save
 * @returns Promise resolving to the saved task record ID
 * @throws Error if save fails
 */
export async function saveTasks(
  projectId: string,
  prdVersionId: string,
  tasks: TasksJson
): Promise<{ id: string }> {
  const headers = await getClientAuthHeaders();
  const response = await fetch('/api/tasks/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ projectId, prdVersionId, tasks }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Unknown error',
    }));

    if (response.status === 401) {
      throw new Error('인증이 필요합니다.');
    }

    if (response.status === 403) {
      throw new Error('접근 권한이 없습니다.');
    }

    if (response.status === 404) {
      throw new Error('프로젝트 또는 PRD 버전을 찾을 수 없습니다.');
    }

    if (response.status === 400) {
      throw new Error(
        errorData.error || '잘못된 작업 데이터입니다. 형식을 확인해주세요.'
      );
    }

    throw new Error(
      errorData.error || `Failed to save tasks: ${response.status}`
    );
  }

  return await response.json();
}

