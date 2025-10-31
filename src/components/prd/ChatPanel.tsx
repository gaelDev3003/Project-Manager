'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChatMessage, PRDChatState } from '@/types/prd';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  projectId: string;
  onPRDFinalized: () => void;
  selectedVersion?: {
    id: string;
    title: string;
    date: string;
  };
}

const tagColors = {
  feature: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  revision: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  question: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  feedback: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export default function ChatPanel({
  projectId,
  onPRDFinalized,
  selectedVersion,
}: ChatPanelProps) {
  const [chatState, setChatState] = useState<PRDChatState>({
    messages: [],
    isLoading: false,
    currentStep: 'initial',
  });
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  useEffect(() => {
    fetchChatMessages();
  }, [projectId]);

  const fetchChatMessages = async () => {
    try {
      // PRD 생성 채팅 메시지 가져오기
      const { data: chatData, error: chatError } = await supabase
        .from('project_prd_chat')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (chatError) throw chatError;

      // 피드백 메시지 가져오기 - project_prd_versions를 통해 연결
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('project_prd_feedbacks')
        .select(
          `
          *,
          project_prd_versions!inner(
            project_prds!inner(
              project_id
            )
          )
        `
        )
        .eq('project_prd_versions.project_prds.project_id', projectId)
        .order('created_at', { ascending: true });

      if (feedbackError) throw feedbackError;

      // 두 종류의 메시지를 합쳐서 시간순으로 정렬
      const allMessages = [
        ...(chatData || []).map((msg) => ({
          ...msg,
          type: 'chat',
        })),
        ...(feedbackData || []).map((msg) => ({
          ...msg,
          role: 'user',
          content: msg.message,
          type: 'feedback',
        })),
      ].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setChatState((prev) => ({
        ...prev,
        messages: allMessages,
        currentStep: determineCurrentStep(allMessages),
      }));
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setError('채팅 메시지를 불러오는데 실패했습니다.');
    }
  };

  const determineCurrentStep = (
    messages: ChatMessage[]
  ): PRDChatState['currentStep'] => {
    if (messages.length === 0) return 'initial';

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === 'assistant' &&
      lastMessage.content.includes('PRD 요약')
    ) {
      return 'summary';
    }
    if (
      lastMessage.role === 'assistant' &&
      lastMessage.content.includes('질문')
    ) {
      return 'questions';
    }
    return 'initial';
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data, error } = await supabase
        .from('project_prd_chat')
        .insert({
          project_id: projectId,
          role,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, data],
      }));

      return data;
    } catch (err) {
      console.error('Error saving message:', err);
      throw err;
    }
  };

  const handleInitialIdea = async (idea: string) => {
    try {
      setChatState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Save user message
      await saveMessage('user', idea);

      // Generate AI questions
      const questions = generateClarifyingQuestions(idea);
      await saveMessage('assistant', questions);

      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: 'questions',
      }));
    } catch (err) {
      setError('메시지 저장에 실패했습니다.');
      setChatState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleUserReply = async (reply: string) => {
    try {
      setChatState((prev) => ({ ...prev, isLoading: true }));

      // Save user reply
      await saveMessage('user', reply);

      // Check if this is the final reply and generate summary
      const currentMessages = [
        ...chatState.messages,
        {
          id: '',
          project_id: projectId,
          role: 'user' as const,
          content: reply,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      if (currentMessages.filter((m) => m.role === 'user').length >= 2) {
        // Generate PRD summary
        const summary = generatePRDSummary(currentMessages);
        await saveMessage('assistant', summary);

        setChatState((prev) => ({
          ...prev,
          isLoading: false,
          currentStep: 'summary',
          prdOutline: summary,
        }));
      } else {
        // Continue with more questions
        const nextQuestion = generateFollowUpQuestion(reply);
        await saveMessage('assistant', nextQuestion);

        setChatState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (err) {
      setError('메시지 저장에 실패했습니다.');
      setChatState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const generateClarifyingQuestions = (idea: string): string => {
    return `좋은 아이디어네요! "${idea}"에 대해 더 자세히 알아보겠습니다.

다음 질문들에 답해주시면 더 정확한 PRD를 만들 수 있습니다:

1. **타겟 사용자는 누구인가요?** (예: 개발자, 일반 사용자, 기업 등)

2. **주요 기능은 무엇인가요?** (예: 사용자 인증, 데이터 저장, 실시간 업데이트 등)

3. **기술 스택에 선호사항이 있나요?** (예: React, Node.js, PostgreSQL 등)

4. **예상 사용자 수는 어느 정도인가요?** (예: 소규모, 중간 규모, 대규모)

5. **프로젝트 완료 목표 시기는 언제인가요?** (예: 1개월, 3개월, 6개월 등)

각 질문에 간단히 답해주시면 됩니다!`;
  };

  const generateFollowUpQuestion = (reply: string): string => {
    const questions = [
      '추가로 궁금한 점이 있습니다. 프로젝트에서 가장 중요한 핵심 기능은 무엇인가요?',
      '사용자 경험 측면에서 어떤 부분을 중점적으로 고려해야 할까요?',
      '데이터 보안이나 성능에 특별한 요구사항이 있나요?',
      '기존에 사용하고 있는 도구나 서비스와의 연동이 필요한가요?',
      '프로젝트의 성공 기준은 무엇으로 보시나요?',
    ];

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];
    return `감사합니다! ${randomQuestion}`;
  };

  const generatePRDSummary = (messages: ChatMessage[]): string => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const idea = userMessages[0]?.content || '';
    const answers = userMessages
      .slice(1)
      .map((m) => m.content)
      .join(' ');

    return `## PRD 요약

**프로젝트 아이디어:** ${idea}

**사용자 답변 기반 분석:**
${answers}

**제안하는 PRD 구조:**
1. **프로젝트 개요** - 목표와 핵심 가치 제안
2. **기능 요구사항** - 사용자 답변을 바탕으로 한 주요 기능들
3. **기술 아키텍처** - 선호 기술 스택과 확장성 고려
4. **구현 계획** - 단계별 개발 로드맵
5. **성공 지표** - 측정 가능한 목표들

위 내용을 바탕으로 상세한 PRD를 생성하시겠습니까?`;
  };

  const handleFinalizePRD = async () => {
    try {
      setChatState((prev) => ({ ...prev, isLoading: true }));

      // Get all user messages to create final idea
      const userMessages = chatState.messages.filter((m) => m.role === 'user');
      const finalIdea = userMessages.map((m) => m.content).join('\n\n');

      // Call existing PRD generation API
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/gen/prd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          idea: finalIdea,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'PRD 생성에 실패했습니다.');
      }

      // Save finalization message
      await saveMessage(
        'assistant',
        'PRD가 성공적으로 생성되었습니다! PRD 탭에서 확인하실 수 있습니다.'
      );

      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: 'finalized',
      }));

      // Wait a moment for the PRD to be fully saved to database
      setTimeout(() => {
        onPRDFinalized();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PRD 생성에 실패했습니다.');
      setChatState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  if (chatState.currentStep === 'finalized') {
    return (
      <div className="bg-white rounded-xl ring-1 ring-gray-100/30 p-8">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-6">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 leading-relaxed">
            PRD 생성 완료!
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            PRD가 성공적으로 생성되었습니다. PRD 탭에서 확인하실 수 있습니다.
          </p>
          <button
            onClick={() => {
              setChatState({
                messages: [],
                isLoading: false,
                currentStep: 'initial',
              });
              setError(null);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            새로운 PRD 시작하기
          </button>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      project_id: projectId,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: 'feedback',
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
    setInput('');

    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);

    // Call feedback API
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // If no version selected, find v0 version
      let versionId = selectedVersion?.id;
      if (!versionId) {
        // First find the project_prd_id
        const { data: prdData } = await supabase
          .from('project_prds')
          .select('id')
          .eq('project_id', projectId)
          .single();

        if (prdData) {
          const { data: versions } = await supabase
            .from('project_prd_versions')
            .select('id')
            .eq('project_prd_id', prdData.id)
            .eq('version', 0)
            .single();
          versionId = versions?.id;
        }
      }

      // If still no versionId, don't send it (let server handle it)
      if (!versionId) {
        console.log('No versionId found, letting server handle v0 lookup');
      }

      const response = await fetch(
        `/api/projects/${projectId}/prd/apply-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            versionId: versionId,
            message: input,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('피드백 적용에 실패했습니다.');
      }

      const result = await response.json();

      // Add AI response
      // result.version is the full version object, result.version.version is the version number
      const versionNumber =
        result.version?.version || result.version || '새로운';
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        project_id: projectId,
        role: 'assistant',
        content: `피드백이 적용되어 새로운 버전(v${versionNumber})이 생성되었습니다.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: 'chat',
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
      }));

      onPRDFinalized();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(
        err instanceof Error ? err.message : '피드백 적용에 실패했습니다.'
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Version Header */}
      {selectedVersion && (
        <div className="border-b border-gray-100 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {selectedVersion.title}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Last updated{' '}
                {new Date(selectedVersion.date).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-gray-200">
              {selectedVersion.id}
            </Badge>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Chat Transcript */}
      <ScrollArea className="flex-1 px-8" ref={messagesEndRef}>
        <div className="space-y-8 py-8">
          {chatState.messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-indigo-100/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                안녕하세요!
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                프로젝트 아이디어를 간단히 설명해주시면,
                <br />
                AI가 몇 가지 질문을 통해 더 나은 PRD를 만들어드릴게요.
              </p>
            </div>
          ) : (
            chatState.messages.map((message, index) => (
              <div key={message.id || index} className="space-y-3">
                <div
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] space-y-4 rounded-xl px-6 py-5',
                      message.role === 'user'
                        ? 'bg-indigo-50 text-indigo-900 shadow-sm border border-indigo-200'
                        : 'bg-gray-50 ring-1 ring-gray-100/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {message.type && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-medium px-2 py-1',
                            message.role === 'user'
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                              : tagColors[
                                  message.type as keyof typeof tagColors
                                ]
                          )}
                        >
                          {message.type === 'feedback'
                            ? '피드백'
                            : message.type}
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-base leading-relaxed font-medium">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        'text-xs font-medium',
                        message.role === 'user'
                          ? 'text-indigo-600'
                          : 'text-gray-500'
                      )}
                    >
                      {new Date(message.created_at).toLocaleTimeString(
                        'ko-KR',
                        {
                          hour: 'numeric',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {chatState.isLoading && (
            <div className="flex justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-xl bg-gray-50 ring-1 ring-gray-100/50 px-5 py-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm">AI가 생각 중...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-gray-100 bg-white p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="피드백을 입력하세요... (⌘+Enter로 전송)"
              className="min-h-[80px] resize-none pr-12 border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-[80px] px-6 bg-indigo-600 hover:bg-indigo-500"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">⌘</kbd> +{' '}
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
            Enter
          </kbd>
          를 눌러 전송
        </p>
      </div>
    </main>
  );
}
