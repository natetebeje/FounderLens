import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ChevronUp, ChevronDown, Sparkles, Loader2, FileText, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { ProductProposalModal } from './ProductProposalModal';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface OpportunityChatProps {
  opportunityId: string;
  opportunityTitle: string;
  researchData?: {
    opportunityScore?: number;
    verdict?: string;
    painPoints?: string[];
    competitors?: { name: string; description: string; gap: string }[];
    marketGaps?: string[];
  } | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function extractProposalJson(content: string): object | null {
  const match = content.match(/```proposal-json\n([\s\S]*?)```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function renderMessageContent(content: string): string {
  // Strip the raw JSON block from displayed messages — it will be shown in the modal
  return content.replace(/```proposal-json[\s\S]*?```/g, '').trim();
}

// ============================================================================
// STREAMING HOOK
// ============================================================================

function useStreamingChat(opportunityId: string) {
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (
    message: string,
    mode: 'chat' | 'generate_proposal',
    onToken: (token: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: string) => void
  ) => {
    setIsStreaming(true);
    let fullText = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = (supabase as any).supabaseUrl ||
        import.meta.env.VITE_SUPABASE_URL ||
        'https://phppdhsozkpsquxlfezg.supabase.co';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/opportunity-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ opportunityId, message, mode }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone(fullText);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              onToken(parsed.token);
            }
          } catch { /* skip */ }
        }
      }

      onDone(fullText);
    } catch (err: any) {
      onError(err.message || 'Something went wrong');
    } finally {
      setIsStreaming(false);
    }
  }, [opportunityId]);

  return { isStreaming, sendMessage };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OpportunityChat({ opportunityId, opportunityTitle, researchData }: OpportunityChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [proposal, setProposal] = useState<object | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, sendMessage } = useStreamingChat(opportunityId);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const showProposalButton = userMessageCount >= 3 || !!proposal;

  // Load history from DB on panel open
  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: chat } = await supabase
          .from('opportunity_chats')
          .select('id')
          .eq('opportunity_id', opportunityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (chat) {
          const { data: rows } = await supabase
            .from('opportunity_chat_messages')
            .select('id, role, content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true })
            .limit(40);

          if (rows && rows.length > 0) {
            setMessages(rows.map(r => ({
              id: r.id,
              role: r.role as 'user' | 'assistant',
              content: r.content,
              createdAt: r.created_at,
            })));

            // Check for existing proposal in the last assistant message
            const lastAssistant = [...rows].reverse().find(r => r.role === 'assistant');
            if (lastAssistant) {
              const extracted = extractProposalJson(lastAssistant.content);
              if (extracted) setProposal(extracted);
            }
          } else {
            // No history — show opening message
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: buildWelcomeMessage(opportunityTitle, researchData),
            }]);
          }
        } else {
          // Brand new chat
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: buildWelcomeMessage(opportunityTitle, researchData),
          }]);
        }

        // Also load saved proposal from validation_workflows
        const { data: workflow } = await supabase
          .from('validation_workflows')
          .select('product_proposal')
          .eq('opportunity_id', opportunityId)
          .maybeSingle();

        if (workflow?.product_proposal && Object.keys(workflow.product_proposal).length > 0) {
          setProposal(workflow.product_proposal);
        }

        setHasLoadedHistory(true);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [isOpen, hasLoadedHistory, opportunityId, opportunityTitle, researchData]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async (mode: 'chat' | 'generate_proposal' = 'chat') => {
    const text = mode === 'generate_proposal' ? '' : input.trim();
    if (mode === 'chat' && !text) return;
    if (isStreaming) return;

    setInput('');
    setStreamingContent('');

    // Optimistically add user message to UI
    if (mode === 'chat') {
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      }]);
    }

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '' }]);

    await sendMessage(
      text,
      mode,
      (token) => setStreamingContent(prev => prev + token),
      (fullText) => {
        setStreamingContent('');
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, content: fullText } : m
        ));

        // Extract proposal if present
        const extracted = extractProposalJson(fullText);
        if (extracted) {
          setProposal(extracted);
          setShowProposalModal(true);
        }
      },
      (err) => {
        setStreamingContent('');
        setMessages(prev => prev.map(m =>
          m.id === streamingId
            ? { ...m, content: `Sorry, something went wrong: ${err}` }
            : m
        ));
      }
    );
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('chat');
    }
  };

  return (
    <>
      {/* Collapsible Panel */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm overflow-hidden">
        {/* Header — always visible */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Idea Coach</div>
              <div className="text-xs text-white/50">
                {proposal
                  ? 'Product Proposal ready — click to view'
                  : userMessageCount === 0
                    ? 'Chat with AI to structure your idea'
                    : `${userMessageCount} exchange${userMessageCount !== 1 ? 's' : ''} · ${showProposalButton ? 'Proposal ready to generate' : `${3 - userMessageCount} more to unlock proposal`}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {proposal && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowProposalModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                View Proposal
              </button>
            )}
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white/40" />
            )}
          </div>
        </button>

        {/* Chat Panel */}
        {isOpen && (
          <div className="border-t border-white/10">
            {/* Messages */}
            <div className="h-80 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.id.startsWith('streaming-') ? streamingContent : msg.content}
                      isStreaming={msg.id.startsWith('streaming-') && isStreaming}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or share your thinking..."
                  className="min-h-[44px] max-h-32 resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-indigo-500/50 focus:ring-indigo-500/20"
                  disabled={isStreaming}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSend('chat')}
                    disabled={!input.trim() || isStreaming}
                    size="icon"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Generate Proposal CTA */}
              {showProposalButton && (
                <button
                  onClick={() => proposal ? setShowProposalModal(true) : handleSend('generate_proposal')}
                  disabled={isStreaming}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:from-indigo-600/40 hover:to-purple-600/40 transition-all disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {proposal ? 'View Product Proposal' : 'Generate Product Proposal'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      {showProposalModal && proposal && (
        <ProductProposalModal
          proposal={proposal as any}
          opportunityTitle={opportunityTitle}
          opportunityId={opportunityId}
          onClose={() => setShowProposalModal(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({
  role,
  content,
  isStreaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}) {
  const displayContent = renderMessageContent(content);
  const hasProposal = content.includes('```proposal-json');

  return (
    <div className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        role === 'assistant'
          ? 'bg-indigo-500/20'
          : 'bg-white/10'
      }`}>
        {role === 'assistant' ? (
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <User className="w-3.5 h-3.5 text-white/60" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[82%] ${role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          role === 'assistant'
            ? 'bg-white/5 text-white/90 rounded-tl-sm'
            : 'bg-indigo-600/30 text-white rounded-tr-sm'
        }`}>
          {displayContent || (isStreaming ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          ) : '')}
          {isStreaming && displayContent && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
        {hasProposal && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
            <FileText className="w-3 h-3" />
            Product Proposal generated — click "View Proposal" above
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WELCOME MESSAGE BUILDER
// ============================================================================

function buildWelcomeMessage(
  title: string,
  research?: {
    opportunityScore?: number;
    verdict?: string;
    painPoints?: string[]
    competitors?: { name: string }[];
  } | null
): string {
  if (!research || !research.opportunityScore) {
    return `I'm your Idea Coach for **"${title}"**.\n\nI'm here to help you structure this into a real, buildable business. Let's start simple: who is the most specific person who needs this right now? Not a broad demographic — give me a day-in-the-life description of your ideal first customer.`;
  }

  const score = research.opportunityScore;
  const topPain = research.painPoints?.[0];
  const topCompetitor = research.competitors?.[0]?.name;

  let opener = '';
  if (score >= 70) {
    opener = `The research engine gave **"${title}"** a strong ${score}/100 score — there's real community demand here.`;
  } else if (score >= 45) {
    opener = `The research engine scored **"${title}"** at ${score}/100 — moderate signal with clear gaps to exploit.`;
  } else {
    opener = `The research engine found limited direct evidence for **"${title}"** (${score}/100) — this is either an underserved niche or needs a sharper angle.`;
  }

  let context = '';
  if (topPain) context += ` The top pain point found: "${topPain}".`;
  if (topCompetitor) context += ` The closest competitor is ${topCompetitor} — and they have gaps.`;

  return `${opener}${context}\n\nI've read the full research report. Now I need to understand **you and your angle**.\n\nStart here: who is the most specific person who needs this right now? Not "new moms" — give me a day-in-the-life description of your ideal first paying customer.`;
}
