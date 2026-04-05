import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { Send, Sparkles, Loader2, FileText, Bot, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

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

function generateProposalPdf(proposal: any, title: string) {
  const p = proposal;
  const esc = (s: string) => s?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ?? '';
  const list = (items: string[] | undefined, marker = '•') =>
    items?.map(i => `<li>${marker} ${esc(i)}</li>`).join('') ?? '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(p.productName || title)} — Product Proposal</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 48px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 4px; color: #1a1a2e; }
  .oneliner { font-size: 15px; color: #555; margin-bottom: 6px; }
  .tagline { font-size: 16px; color: #444; font-style: italic; margin-bottom: 24px; }
  .score-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
  .score-high { background: #d1fae5; color: #065f46; }
  .score-mid { background: #fef3c7; color: #92400e; }
  .score-low { background: #fee2e2; color: #991b1b; }
  h2 { font-size: 18px; color: #312e81; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e0e7ff; }
  h3 { font-size: 14px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px; margin: 14px 0 6px; }
  p { margin-bottom: 8px; font-size: 14px; }
  ul, ol { margin: 6px 0 12px 20px; font-size: 14px; }
  li { margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 8px 0 16px; }
  .grid-box { background: #f5f3ff; border-radius: 8px; padding: 12px; }
  .grid-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .grid-box .value { font-size: 15px; font-weight: 600; color: #1e1b4b; }
  .highlight { background: #eef2ff; border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 4px; margin: 8px 0; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  @media print { body { padding: 24px; } }
</style></head><body>
<h1>${esc(p.productName || title)}</h1>
${p.oneLiner ? `<p class="oneliner">${esc(p.oneLiner)}</p>` : ''}
${p.tagline ? `<p class="tagline">"${esc(p.tagline)}"</p>` : ''}
${p.researchBacking?.opportunityScore ? `<span class="score-badge ${p.researchBacking.opportunityScore >= 70 ? 'score-high' : p.researchBacking.opportunityScore >= 45 ? 'score-mid' : 'score-low'}">${p.researchBacking.opportunityScore}/100 Opportunity Score</span>` : ''}

${p.problemStatement ? `<h2>Problem Statement</h2><p>${esc(p.problemStatement)}</p>` : ''}

${p.targetUser ? `<h2>Target User</h2>
${p.targetUser.persona ? `<p><strong>Persona:</strong> ${esc(p.targetUser.persona)}</p>` : ''}
${p.targetUser.painPoints?.length ? `<h3>Pain Points</h3><ul>${list(p.targetUser.painPoints)}</ul>` : ''}
${p.targetUser.jobsToBeDone?.length ? `<h3>Jobs to Be Done</h3><ul>${list(p.targetUser.jobsToBeDone)}</ul>` : ''}
${p.targetUser.currentAlternatives?.length ? `<h3>Current Alternatives</h3><ul>${list(p.targetUser.currentAlternatives)}</ul>` : ''}` : ''}

${p.marketOpportunity ? `<h2>Market Opportunity</h2>
<div class="grid">
${p.marketOpportunity.targetMarketSize ? `<div class="grid-box"><div class="label">Total Market (TAM)</div><div class="value">${esc(p.marketOpportunity.targetMarketSize)}</div></div>` : ''}
${p.marketOpportunity.serviceableMarket ? `<div class="grid-box"><div class="label">Serviceable Market (SAM)</div><div class="value">${esc(p.marketOpportunity.serviceableMarket)}</div></div>` : ''}
</div>
${p.marketOpportunity.competitorGaps?.length ? `<h3>Competitor Gaps</h3><ul>${list(p.marketOpportunity.competitorGaps, '▲')}</ul>` : ''}` : ''}

${p.solution ? `<h2>Solution</h2>
${p.solution.uniqueDifferentiator ? `<div class="highlight"><strong>Differentiator:</strong> ${esc(p.solution.uniqueDifferentiator)}</div>` : ''}
${p.solution.unfairAdvantage ? `<div class="highlight"><strong>Unfair Advantage:</strong> ${esc(p.solution.unfairAdvantage)}</div>` : ''}
${p.solution.coreFeatures?.length ? `<h3>Core Features</h3><ol>${p.solution.coreFeatures.map((f: string) => `<li>${esc(f)}</li>`).join('')}</ol>` : ''}` : ''}

${p.mvpScope ? `<h2>MVP Scope</h2>
${p.mvpScope.mustHave?.length ? `<h3>Must Have (v1)</h3><ul>${list(p.mvpScope.mustHave, '✓')}</ul>` : ''}
${p.mvpScope.niceToHave?.length ? `<h3>Nice to Have (v2)</h3><ul>${list(p.mvpScope.niceToHave, '○')}</ul>` : ''}
${p.mvpScope.outOfScope?.length ? `<h3>Out of Scope</h3><ul>${list(p.mvpScope.outOfScope, '✗')}</ul>` : ''}` : ''}

${p.monetization ? `<h2>Monetization</h2>
${p.monetization.model ? `<p><strong>Model:</strong> ${esc(p.monetization.model)}</p>` : ''}
${p.monetization.pricing ? `<p><strong>Pricing:</strong> ${esc(p.monetization.pricing)}</p>` : ''}
${p.monetization.rationale ? `<p>${esc(p.monetization.rationale)}</p>` : ''}` : ''}

${p.goToMarket ? `<h2>Go-to-Market</h2>
${p.goToMarket.primaryChannel ? `<div class="highlight"><strong>Primary Channel:</strong> ${esc(p.goToMarket.primaryChannel)}</div>` : ''}
${p.goToMarket.launchStrategy ? `<p>${esc(p.goToMarket.launchStrategy)}</p>` : ''}
${p.goToMarket.first30Days ? `<h3>First 30 Days</h3><p>${esc(p.goToMarket.first30Days)}</p>` : ''}` : ''}

${p.risks?.length ? `<h2>Key Risks</h2><ul>${list(p.risks, '⚠')}</ul>` : ''}

${p.nextSteps?.length ? `<h2>Next Steps</h2><ol>${p.nextSteps.map((s: string) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}

<div class="footer">
  Generated by FounderLens Idea Coach
  ${p.researchBacking ? ` · Score: ${p.researchBacking.opportunityScore || 'N/A'}/100 · ${p.researchBacking.dataPoints || 0} data points` : ''}
</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
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
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [proposal, setProposal] = useState<object | null>(null);
  const [paperclipCompanyId, setPaperclipCompanyId] = useState<string | undefined>();
  const [paperclipCompanyUrl, setPaperclipCompanyUrl] = useState<string | undefined>();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
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

        // Also load saved proposal + Paperclip company from validation_workflows
        const { data: workflow } = await supabase
          .from('validation_workflows')
          .select('product_proposal, paperclip_company_id, paperclip_company_url')
          .eq('opportunity_id', opportunityId)
          .maybeSingle();

        if (workflow?.product_proposal && Object.keys(workflow.product_proposal).length > 0) {
          setProposal(workflow.product_proposal);
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
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, id: `msg-${Date.now()}`, content: fullText } : m
        ));
        setStreamingContent('');

        // Extract proposal if present
        const extracted = extractProposalJson(fullText);
        if (extracted) {
          setProposal(extracted);
          generateProposalPdf(extracted, opportunityTitle);
        }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('chat');
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
              onClick={() => generateProposalPdf(proposal, opportunityTitle)}
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
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.id.startsWith('streaming-') ? streamingContent : msg.content}
                  isStreaming={msg.id.startsWith('streaming-') && isStreaming}
                  onDownloadPdf={proposal ? () => generateProposalPdf(proposal, opportunityTitle) : undefined}
                />
              ))}
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

          {showProposalButton && (
            <div className="mt-2 space-y-2">
              {/* Generate / Download Proposal */}
              <button
                onClick={() => proposal ? generateProposalPdf(proposal, opportunityTitle) : handleSend('generate_proposal')}
                disabled={isStreaming || launching}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-100 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:to-purple-600/30 border border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:from-indigo-600/40 dark:hover:to-purple-600/40 transition-all disabled:opacity-50"
              >
                {proposal ? <Download className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                {proposal ? 'Download Proposal PDF' : 'Generate Product Proposal'}
              </button>

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
                  // Not yet launched
                  <button
                    onClick={async () => {
                      if (launching) return;
                      setLaunching(true);
                      setLaunchError(null);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        const supabaseUrl = 'https://phppdhsozkpsquxlfezg.supabase.co';
                        const res = await fetch(`${supabaseUrl}/functions/v1/launch-to-paperclip`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ opportunityId }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Launch failed');
                        setPaperclipCompanyId(data.companyId);
                        setPaperclipCompanyUrl(data.companyUrl);
                        window.open(data.companyUrl, '_blank');
                      } catch (err: any) {
                        setLaunchError(err.message || 'Launch failed. Please try again.');
                      } finally {
                        setLaunching(false);
                      }
                    }}
                    disabled={launching || isStreaming}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border border-indigo-500/40 text-white text-xs font-semibold hover:from-indigo-600/60 hover:to-purple-600/60 transition-all disabled:opacity-60"
                  >
                    {launching ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Hiring your AI team...</>
                    ) : (
                      <><Building2 className="w-3.5 h-3.5" /> Build This</>  
                    )}
                  </button>
                )
              )}
              {launchError && (
                <p className="text-xs text-red-400 text-center">{launchError}</p>
              )}
            </div>
          )}
        </div>
      </div>

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
  onDownloadPdf,
}: {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  onDownloadPdf?: () => void;
}) {
  const displayContent = renderMessageContent(content);
  const hasProposal = content.includes('```proposal-json');

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
        {hasProposal && onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Product Proposal PDF
          </button>
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
