'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PRDGeneratorProps {
  projectId: string;
  onPRDGenerated: () => void;
}

export default function PRDGenerator({
  projectId,
  onPRDGenerated,
}: PRDGeneratorProps) {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idea.trim()) {
      setError('아이디어를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('인증이 필요합니다.');
        return;
      }

      const response = await fetch('/api/gen/prd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          idea: idea.trim(),
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'PRD 생성에 실패했습니다.');
      }

      // Reset form
      setIdea('');
      onPRDGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PRD 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">PRD 생성</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="idea"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            프로젝트 아이디어
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="프로젝트에 대한 아이디어를 자세히 설명해주세요..."
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            AI가 이 아이디어를 바탕으로 체계적인 PRD를 생성합니다.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'PRD 생성 중...' : 'PRD 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
