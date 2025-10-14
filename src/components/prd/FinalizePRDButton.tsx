'use client';

interface FinalizePRDButtonProps {
  onFinalize: () => void;
  disabled?: boolean;
}

export default function FinalizePRDButton({
  onFinalize,
  disabled = false,
}: FinalizePRDButtonProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-green-800 mb-1">
            PRD 생성 준비 완료
          </h4>
          <p className="text-sm text-green-600">
            대화 내용을 바탕으로 상세한 PRD를 생성하시겠습니까?
          </p>
        </div>
        <button
          onClick={onFinalize}
          disabled={disabled}
          className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {disabled ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>생성 중...</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>PRD 생성하기</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
