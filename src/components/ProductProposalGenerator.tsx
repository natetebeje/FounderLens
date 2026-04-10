import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  FileText,
  Download,
  X,
  CheckCircle,
  Sparkles,
  Target,
  Zap,
  DollarSign,
  Compass,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { openProposalPdf, downloadProposalPdf } from '@/lib/proposal-pdf';

interface ProductProposalGeneratorProps {
  opportunityId: string;
  opportunityTitle: string;
  existingProposal?: any | null;
  onGenerated: (proposal: any) => void;
  onClose: () => void;
}

const STEPS = [
  { label: 'Analyzing validation research', icon: Sparkles },
  { label: 'Drafting product concept', icon: Target },
  { label: 'Structuring MVP scope', icon: Zap },
  { label: 'Writing go-to-market plan', icon: Compass },
  { label: 'Finalizing document', icon: CheckCircle },
];

function extractProposalJson(raw: string): any | null {
  if (!raw) return null;
  const content = raw.replace(/\r\n/g, '\n');

  const labeled =
    content.match(/```proposal-json\s*\n([\s\S]*?)```/) ||
    content.match(/```proposal-json\s*\n([\s\S]*)$/);
  if (labeled) {
    const parsed = safeParseJson(labeled[1]);
    if (parsed) return parsed;
  }

  const generic =
    content.match(/```json\s*\n([\s\S]*?)```/) ||
    content.match(/```json\s*\n([\s\S]*)$/) ||
    content.match(/```\s*\n([\s\S]*?)```/);
  if (generic) {
    const parsed = safeParseJson(generic[1]);
    if (parsed) return parsed;
  }

  const first = content.indexOf('{');
  if (first !== -1) {
    const candidate = sliceBalancedJson(content, first);
    if (candidate) {
      const parsed = safeParseJson(candidate);
      if (parsed) return parsed;
    }
  }

  return null;
}

function safeParseJson(text: string): any | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch { /* try forgiving pass */ }
  const relaxed = trimmed.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(relaxed);
  } catch { return null; }
}

function sliceBalancedJson(content: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

export function ProductProposalGenerator({
  opportunityId,
  opportunityTitle,
  existingProposal,
  onGenerated,
  onClose,
}: ProductProposalGeneratorProps) {
  const [phase, setPhase] = useState<'generating' | 'ready' | 'error'>(
    existingProposal ? 'ready' : 'generating'
  );
  const [proposal, setProposal] = useState<any | null>(existingProposal ?? null);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [streamedChars, setStreamedChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);
  const onGeneratedRef = useRef(onGenerated);

  // Keep the latest onGenerated callback without triggering the fetch effect
  // to re-run (which would otherwise tear down the in-flight stream).
  useEffect(() => {
    onGeneratedRef.current = onGenerated;
  }, [onGenerated]);

  // Mount/unmount-only cancellation flag. Using a ref tied to real unmount
  // (not effect re-runs) prevents React StrictMode or parent re-renders from
  // poisoning the streaming fetch and dropping tokens mid-flight.
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  // Advance the animated step labels while the LLM streams. Let it naturally
  // reach the final step ("Finalizing document") and park there — we'll still
  // show an elapsed-time counter and a streaming-chars indicator so the user
  // can always see work is in progress even after the labels stop advancing.
  useEffect(() => {
    if (phase !== 'generating') return;
    const timer = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2200);
    return () => clearInterval(timer);
  }, [phase]);

  // Elapsed-time ticker so the user sees continuous progress.
  useEffect(() => {
    if (phase !== 'generating') return;
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Call the edge function once on mount when generating.
  useEffect(() => {
    if (phase !== 'generating' || startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const supabaseUrl =
          (supabase as any).supabaseUrl ||
          import.meta.env.VITE_SUPABASE_URL ||
          'https://phppdhsozkpsquxlfezg.supabase.co';

        const response = await fetch(`${supabaseUrl}/functions/v1/opportunity-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            opportunityId,
            message: '',
            mode: 'generate_proposal',
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sseBuffer = '';
        let sawDone = false;

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelledRef.current) return;
          sseBuffer += decoder.decode(value, { stream: true });
          // Split on newlines, keeping the trailing partial line buffered for
          // the next read. SSE frames can span chunk boundaries — splitting
          // eagerly and discarding partial lines drops tokens mid-stream.
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') { sawDone = true; break outer; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullText += parsed.token;
                setStreamedChars(fullText.length);
              }
            } catch { /* skip malformed frame */ }
          }
        }
        // Flush any trailing buffered line (rare — only if server didn't emit a final newline).
        if (!sawDone && sseBuffer.trim().startsWith('data: ')) {
          const data = sseBuffer.trim().slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullText += parsed.token;
                setStreamedChars(fullText.length);
              }
            } catch { /* ignore */ }
          }
        }

        if (cancelledRef.current) return;

        // Happy path: server is in JSON mode, so the whole stream is raw JSON.
        let extracted: any = null;
        try {
          extracted = JSON.parse(fullText.trim());
        } catch { /* fall through to resilient extractor */ }
        if (!extracted) {
          extracted = extractProposalJson(fullText);
        }
        if (!extracted) {
          console.error('[ProductProposalGenerator] Unable to extract proposal JSON. Raw length:', fullText.length);
          console.error('[ProductProposalGenerator] Last 500 chars:', fullText.slice(-500));
          throw new Error('Proposal generated but could not be parsed. Try regenerating.');
        }

        // Jump to the last animated step for a beat before switching to ready.
        setStepIndex(STEPS.length - 1);
        setTimeout(() => {
          if (cancelledRef.current) return;
          setProposal(extracted);
          setPhase('ready');
          onGeneratedRef.current(extracted);
        }, 500);
      } catch (err: any) {
        if (cancelledRef.current) return;
        setError(err.message || 'Failed to generate proposal.');
        setPhase('error');
      }
    };

    run();
  }, [phase, opportunityId]);

  const handleRetry = () => {
    setError(null);
    setStepIndex(0);
    setElapsedSec(0);
    setStreamedChars(0);
    startedRef.current = false;
    cancelledRef.current = false;
    setPhase('generating');
  };

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">Product Proposal</div>
              <div className="text-xs text-muted-foreground">{opportunityTitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {phase === 'generating' && (
            <GeneratingView
              stepIndex={stepIndex}
              elapsedSec={elapsedSec}
              streamedChars={streamedChars}
            />
          )}
          {phase === 'error' && (
            <div className="p-10 text-center space-y-4">
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              <Button onClick={handleRetry} variant="outline" size="sm">
                Try again
              </Button>
            </div>
          )}
          {phase === 'ready' && proposal && (
            <ReadyView proposal={proposal} />
          )}
        </div>

        {phase === 'ready' && proposal && (
          <div className="flex flex-col sm:flex-row gap-2 px-6 py-4 border-t border-border bg-muted/40">
            <Button
              className="flex-1"
              onClick={() => openProposalPdf(proposal, opportunityTitle)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Full PDF
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => downloadProposalPdf(proposal, opportunityTitle)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Generating view ─────────────────────────────────────────────────────────

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function GeneratingView({
  stepIndex,
  elapsedSec,
  streamedChars,
}: {
  stepIndex: number;
  elapsedSec: number;
  streamedChars: number;
}) {
  const longRunning = elapsedSec >= 25;

  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[360px]">
      <div className="relative mb-6">
        <Loader2 className="h-14 w-14 text-primary animate-spin" />
        <FileText className="h-5 w-5 text-primary absolute inset-0 m-auto" />
      </div>
      <div className="text-base font-semibold mb-1">Generating your Product Proposal</div>
      <div className="text-xs text-muted-foreground mb-8">
        Synthesizing validated research into a buildable product spec
      </div>

      <ul className="w-full max-w-sm space-y-2.5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const state: 'done' | 'active' | 'pending' =
            i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
          return (
            <li
              key={step.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                state === 'active' ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <div className={`flex items-center justify-center h-6 w-6 rounded-full transition-colors ${
                state === 'done'
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                  : state === 'active'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {state === 'done' ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : state === 'active' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className={`text-sm ${
                state === 'pending' ? 'text-muted-foreground' : 'font-medium'
              }`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        <span>Elapsed: {formatElapsed(elapsedSec)}</span>
        {streamedChars > 0 && (
          <>
            <span className="opacity-40">·</span>
            <span>{streamedChars.toLocaleString()} chars streamed</span>
          </>
        )}
      </div>

      {longRunning && (
        <div className="mt-3 text-xs text-muted-foreground text-center max-w-sm">
          Still working — a full proposal can take 30–60 seconds. Hang tight.
        </div>
      )}
    </div>
  );
}

// ─── Ready view ──────────────────────────────────────────────────────────────

function ReadyView({ proposal }: { proposal: any }) {
  const p = proposal || {};
  return (
    <div className="p-6 space-y-5">
      <div>
        {p.productName && (
          <h2 className="text-2xl font-bold leading-tight">{p.productName}</h2>
        )}
        {p.oneLiner && (
          <p className="text-sm text-muted-foreground mt-1">{p.oneLiner}</p>
        )}
        {p.tagline && (
          <p className="text-sm italic mt-1">"{p.tagline}"</p>
        )}
      </div>

      {p.problemStatement && (
        <Section icon={Target} label="Problem">
          <p className="text-sm leading-relaxed">{p.problemStatement}</p>
        </Section>
      )}

      {p.targetUser?.persona && (
        <Section icon={Target} label="Target User">
          <p className="text-sm">{p.targetUser.persona}</p>
          {p.targetUser.painPoints?.length > 0 && (
            <BulletList items={p.targetUser.painPoints} />
          )}
        </Section>
      )}

      {p.solution?.coreFeatures?.length > 0 && (
        <Section icon={Zap} label="Core Features">
          <BulletList items={p.solution.coreFeatures} />
          {p.solution.uniqueDifferentiator && (
            <p className="text-sm mt-2">
              <span className="font-semibold">Differentiator: </span>
              {p.solution.uniqueDifferentiator}
            </p>
          )}
        </Section>
      )}

      {p.mvpScope?.mustHave?.length > 0 && (
        <Section icon={CheckCircle} label="MVP Scope">
          <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Must Have</div>
          <BulletList items={p.mvpScope.mustHave} />
          {p.mvpScope.niceToHave?.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground uppercase font-semibold mb-1 mt-3">Nice to Have</div>
              <BulletList items={p.mvpScope.niceToHave} />
            </>
          )}
        </Section>
      )}

      {p.monetization && (p.monetization.model || p.monetization.pricing) && (
        <Section icon={DollarSign} label="Monetization">
          {p.monetization.model && (
            <p className="text-sm"><span className="font-semibold">Model: </span>{p.monetization.model}</p>
          )}
          {p.monetization.pricing && (
            <p className="text-sm"><span className="font-semibold">Pricing: </span>{p.monetization.pricing}</p>
          )}
          {p.monetization.rationale && (
            <p className="text-sm text-muted-foreground mt-1">{p.monetization.rationale}</p>
          )}
        </Section>
      )}

      {p.goToMarket && (
        <Section icon={Compass} label="Go To Market">
          {p.goToMarket.primaryChannel && (
            <p className="text-sm"><span className="font-semibold">Primary Channel: </span>{p.goToMarket.primaryChannel}</p>
          )}
          {p.goToMarket.launchStrategy && (
            <p className="text-sm text-muted-foreground mt-1">{p.goToMarket.launchStrategy}</p>
          )}
        </Section>
      )}

      {p.risks?.length > 0 && (
        <Section icon={Shield} label="Risks">
          <BulletList items={p.risks} />
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-muted-foreground mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
