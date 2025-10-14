import { useState, useEffect } from 'react';

// v0 형식에 맞게 단순화된 Feature 인터페이스
export interface PRDFeature {
  id: string;
  name: string;
  created_at: string;
  priority: string;
  risk: string;
  effort: string;
  impacts?: string[];
  dependencies?: string[];
}

// v0 형식에 맞게 단순화된 Response 인터페이스
export interface PRDFeaturesResponse {
  total: number;
  totalPages: number;
  items: PRDFeature[];
}

type SortDir = 'asc' | 'desc';
type SortSpec =
  | `created_at:${SortDir}`
  | `priority:${SortDir}`
  | `risk:${SortDir}`
  | `name:${Extract<SortDir, 'asc'>}`;

export interface UsePRDFeaturesOptions {
  projectId: string;
  versionId: string;
  sort?: SortSpec;
  priority?: 'high' | 'medium' | 'low';
  risk?: 'high' | 'medium' | 'low';
  page?: number;
  limit?: number;
}

export function usePRDFeatures({
  projectId,
  versionId,
  sort,
  priority,
  risk,
  page = 1,
  limit = 10,
}: UsePRDFeaturesOptions) {
  const [data, setData] = useState<PRDFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !versionId) {
      setLoading(false);
      return;
    }

    const fetchFeatures = async () => {
      try {
        setLoading(true);
        setError(null);

        // 쿼리 파라미터 구성
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (priority) params.append('priority', priority);
        if (risk) params.append('risk', risk);
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const response = await fetch(
          `/api/projects/${projectId}/prd/${versionId}/features?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch features');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [projectId, versionId, sort, priority, risk, page, limit]);

  return { data, loading, error };
}
