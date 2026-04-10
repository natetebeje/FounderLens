import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ExternalLink } from 'lucide-react';
import { SkillsPicker } from './SkillsPicker';
import { Send, Sparkles, Loader2, FileText, Bot, User, Download, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { downloadProposalPdf } from '@/lib/proposal-pdf';
import { ProductProposalGenerator } from './ProductProposalGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  attachment?: { kind: 'proposal'; proposal: any };
}

const PROPOSAL_ATTACHMENT_ID = 'proposal-attachment';

function proposalAttachmentMessage(proposal: any): Message {
  return {
    id: PROPOSAL_ATTACHMENT_ID,
    role: 'assistant',
    content: '',
    attachment: { kind: 'proposal', proposal },
  };
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

function extractFollowups(content: string): string[] {
  const match = content.match(/<followups>([\s\S]*?)<\/followups>/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(s => s.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function renderMessageContent(content: string): string {
  // Strip the raw JSON and the followups tags — displayed separately.
  return content
    .replace(/```proposal-json[\s\S]*?```/g, '')
    .replace(/<followups>[\s\S]*?<\/followups>/g, '')
    .trim();
}

const STARTER_QUESTIONS = [
  'Who is the most specific target user?',
  "What's the smallest version someone would pay for?",
  "What's my unfair advantage?",
];

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
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        // SSE frames can span chunk boundaries — buffer any trailing partial
        // line across reads so we never drop characters from a split token.
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || !line.startsWith('data: ')) continue;
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
          } catch { /* skip malformed frame */ }
        }
      }

      // Flush trailing buffered frame if the stream ended without a newline.
      if (sseBuffer.trim().startsWith('data: ')) {
        const data = sseBuffer.trim().slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              onToken(parsed.token);
            }
          } catch { /* ignore */ }
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [proposal, setProposal] = useState<object | null>(null);
  const [paperclipCompanyId, setPaperclipCompanyId] = useState<string | undefined>();
  const [paperclipCompanyUrl, setPaperclipCompanyUrl] = useState<string | undefined>();
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [showProposalGen, setShowProposalGen] = useState(false);
  const [proposalGenMode, setProposalGenMode] = useState<'generate' | 'view'>('generate');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, sendMessage } = useStreamingChat(opportunityId);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  // Proposal generation is always available now — no message-count gate.
  const showProposalButton = true;

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

        // Also load saved proposal + Paperclip company from validation_workflows
        const { data: workflow } = await supabase
          .from('validation_workflows')
          .select('product_proposal, paperclip_company_id, paperclip_company_url')
          .eq('opportunity_id', opportunityId)
          .maybeSingle();

        if (workflow?.product_proposal && Object.keys(workflow.product_proposal).length > 0) {
          setProposal(workflow.product_proposal);
          setMessages(prev => {
            const without = prev.filter(m => m.id !== PROPOSAL_ATTACHMENT_ID);
            return [...without, proposalAttachmentMessage(workflow.product_proposal)];
          });
        }
        if (workflow?.paperclip_company_id) {
          setPaperclipCompanyId(workflow.paperclip_company_id);
          setPaperclipCompanyUrl(workflow.paperclip_company_url || 'https://build.founderlens.io');
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

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    setInput('');
    setStreamingContent('');

    // Optimistically add user message to UI
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }]);

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '' }]);

    await sendMessage(
      text,
      'chat',
      (token) => setStreamingContent(prev => prev + token),
      (fullText) => {
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, id: `msg-${Date.now()}`, content: fullText } : m
        ));
        setStreamingContent('');
      },
      (err) => {
        setMessages(prev => prev.map(m =>
          m.id === streamingId
            ? { ...m, id: `msg-error-${Date.now()}`, content: `Sorry, something went wrong: ${err}` }
            : m
        ));
        setStreamingContent('');
      }
    );
  }, [input, isStreaming, sendMessage]);

  const handleProposalGenerated = useCallback((newProposal: any) => {
    setProposal(newProposal);
    setMessages(prev => {
      const without = prev.filter(m => m.id !== PROPOSAL_ATTACHMENT_ID);
      return [...without, proposalAttachmentMessage(newProposal)];
    });
  }, []);

  const openGenerator = (mode: 'generate' | 'view') => {
    setProposalGenMode(mode);
    setShowProposalGen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Idea Coach</div>
              <div className="text-[11px] text-muted-foreground">
                {proposal
                  ? 'Product Proposal ready'
                  : userMessageCount === 0
                    ? 'Structure your idea'
                    : `${userMessageCount} exchange${userMessageCount !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          {proposal && (
            <button
              onClick={() => downloadProposalPdf(proposal, opportunityTitle)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download PDF
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth min-h-0 bg-background/50">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                if (msg.attachment?.kind === 'proposal') {
                  return (
                    <ProposalAttachmentBubble
                      key={msg.id}
                      proposal={msg.attachment.proposal}
                      opportunityTitle={opportunityTitle}
                      onView={() => openGenerator('view')}
                      onRegenerate={() => openGenerator('generate')}
                    />
                  );
                }
                const isLast = idx === messages.length - 1;
                const isStreamingMsg = msg.id.startsWith('streaming-');
                const displayContent = isStreamingMsg ? streamingContent : msg.content;
                const followups =
                  isLast && msg.role === 'assistant' && !isStreamingMsg
                    ? extractFollowups(msg.content)
                    : [];
                return (
                  <div key={msg.id}>
                    <MessageBubble
                      role={msg.role}
                      content={displayContent}
                      isStreaming={isStreamingMsg && isStreaming}
                    />
                    {/* Follow-up chips under the latest assistant message */}
                    {followups.length > 0 && !isStreaming && (
                      <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                        {followups.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(q)}
                            className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Starter chips — only when the welcome message is the sole message */}
              {messages.length === 1 && !isStreaming && (
                <div className="ml-9 flex flex-wrap gap-1.5 pt-1">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-muted/30">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="min-h-[40px] max-h-28 resize-none bg-background border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-indigo-500/50 focus:ring-indigo-500/20"
              disabled={isStreaming}
            />
            <Button
              onClick={() => handleSend()}
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

          {showProposalButton && (
            <div className="mt-2 space-y-2">
              {!proposal && (
                <button
                  onClick={() => openGenerator('generate')}
                  disabled={isStreaming}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-100 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:to-purple-600/30 border border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:from-indigo-600/40 dark:hover:to-purple-600/40 transition-all disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate Product Proposal
                </button>
              )}

              {/* Build This — only shows after proposal is generated */}
              {proposal && (
                paperclipCompanyId ? (
                  // Already launched — show open button
                  <button
                    onClick={() => window.open(paperclipCompanyUrl || 'https://build.founderlens.io', '_blank')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open AI Company Dashboard
                  </button>
                ) : (
                  // Not yet launched — navigate to the pre-launch confirmation page
                  <button
                    onClick={() => navigate(`/build?from=opportunity&id=${opportunityId}`)}
                    disabled={isStreaming}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border border-indigo-500/40 text-white text-xs font-semibold hover:from-indigo-600/60 hover:to-purple-600/60 transition-all disabled:opacity-60"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Build This
                  </button>
                )
              )}

              {/* Skills Picker — shown after company is launched */}
              {paperclipCompanyId && (
                <div className="mt-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                  <SkillsPicker
                    opportunityId={opportunityId}
                    companyId={paperclipCompanyId}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showProposalGen && (
        <ProductProposalGenerator
          opportunityId={opportunityId}
          opportunityTitle={opportunityTitle}
          existingProposal={proposalGenMode === 'view' ? proposal : null}
          onGenerated={handleProposalGenerated}
          onClose={() => setShowProposalGen(false)}
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

  return (
    <div className={`flex gap-2.5 ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        role === 'assistant'
          ? 'bg-indigo-100 dark:bg-indigo-500/20'
          : 'bg-gray-100 dark:bg-white/10'
      }`}>
        {role === 'assistant' ? (
          <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <User className="w-3.5 h-3.5 text-gray-500 dark:text-white/60" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          role === 'assistant'
            ? 'bg-muted text-foreground rounded-tl-sm'
            : 'bg-indigo-600 dark:bg-indigo-600/80 text-white rounded-tr-sm'
        }`}>
          {displayContent || (isStreaming ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          ) : '')}
          {isStreaming && displayContent && (
            <span className="inline-block w-0.5 h-4 bg-indigo-500 dark:bg-indigo-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROPOSAL ATTACHMENT BUBBLE
// ============================================================================

function ProposalAttachmentBubble({
  proposal,
  opportunityTitle,
  onView,
  onRegenerate,
}: {
  proposal: any;
  opportunityTitle: string;
  onView: () => void;
  onRegenerate: () => void;
}) {
  const productName = proposal?.productName || opportunityTitle;
  const safeName = String(productName).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'proposal';
  const fileName = `Product-Proposal-${safeName}.pdf`;

  return (
    <div className="flex gap-2.5 flex-row">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-indigo-100 dark:bg-indigo-500/20">
        <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="max-w-[85%] flex flex-col gap-1">
        <button
          type="button"
          onClick={onView}
          className="group flex items-center gap-3 rounded-2xl rounded-tl-sm border border-indigo-200 dark:border-indigo-500/30 bg-muted hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-2.5 text-left transition-colors"
        >
          <div className="w-10 h-12 rounded-md bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground truncate">
              {fileName}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Product Proposal · Click to view
            </div>
          </div>
        </button>

        <div className="flex flex-wrap gap-1.5 pl-1">
          <button
            type="button"
            onClick={onView}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-background hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition-colors"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
          <button
            type="button"
            onClick={() => downloadProposalPdf(proposal, opportunityTitle)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-background hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-background hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
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
