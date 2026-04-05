# Skill: FounderLens Architecture & Conventions

This skill defines the patterns, conventions, and rules every agent must follow when generating code for FounderLens. Deviating from these will produce code that doesn't match the codebase and can't be merged.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| Routing | React Router v6 (`useNavigate`, `useParams`, `useSearchParams`) |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind) |
| Styling | Tailwind CSS v3 — utility classes only, no custom CSS except `index.css` |
| State | React hooks only — no Redux, no Zustand, no MobX |
| Backend | Supabase (Postgres + Auth + Edge Functions + Storage) |
| Edge Functions | Deno TypeScript (not Node.js — use `https://deno.land/` imports) |
| AI | OpenAI GPT-4o via REST API |
| Payments | Stripe via Edge Functions |
| Deployment | VPS (nginx) — `npm run build` → `/var/www/founderlens/` |

---

## Component Rules

### 1. Always use shadcn/ui primitives
Never write raw `<div className="border rounded-lg p-4">` when a `Card` exists.

```typescript
// ✓ CORRECT
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
<Card><CardContent className="p-4">...</CardContent></Card>

// ✗ WRONG
<div className="rounded-lg border bg-card p-4">...</div>
```

### 2. Theme-aware colors — never hardcode dark mode
```typescript
// ✓ CORRECT — works in light AND dark mode
className="text-foreground"
className="text-muted-foreground"
className="bg-background"
className="border-border"
className="bg-muted"
className="text-primary"

// ✗ WRONG — only works in dark mode
className="text-white"
className="text-white/60"
className="bg-black/30"
className="border-white/10"
```

For colored states, always include dark variants:
```typescript
// ✓ CORRECT
className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"

// ✗ WRONG
className="bg-green-500/15 text-green-400"
```

### 3. Loading states use Skeleton, not spinners in content
```typescript
// In card content while loading
import { Skeleton } from '@/components/ui/skeleton';
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-4 w-1/2 mt-1" />

// Full page loading
import { Loader2 } from 'lucide-react';
<div className="flex items-center justify-center py-16">
  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
</div>
```

### 4. Icons always from lucide-react
```typescript
import { ArrowRight, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
// Never use heroicons, react-icons, or SVG embeds
```

### 5. Toast notifications via sonner
```typescript
import { toast } from 'sonner';
toast.success('Operation completed');
toast.error('Something went wrong');
// NOT: import { useToast } from '@/hooks/use-toast' for new components
```

### 6. Forms always use react-hook-form + zod
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
```

---

## Page Conventions

### New pages must be:
1. Default exported: `export default function MyPage() {}`
2. Lazy loaded in App.tsx: `const MyPage = lazy(() => import('./pages/MyPage'));`
3. Wrapped in `<ProtectedRoute requireWorkspace>` if auth required
4. Use `<ModernContainer>` as the outer wrapper (not a raw `<div>`)

```typescript
// Minimum page structure
import { ModernContainer } from '@/components/ui/modern-background';
import { ModernNavigation } from '@/components/ModernNavigation';

export default function NewPage() {
  return (
    <ModernContainer>
      <ModernNavigation />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* content */}
      </div>
    </ModernContainer>
  );
}
```

---

## Edge Function Conventions

### Structure every Edge Function like this:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { field1, field2 } = await req.json();
    if (!field1) {
      return new Response(JSON.stringify({ error: 'field1 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ... business logic ...

    return new Response(JSON.stringify({ success: true, data: {} }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('function-name error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Deno import rules:
- Standard library: `https://deno.land/std@0.168.0/...`
- Supabase: `https://esm.sh/@supabase/supabase-js@2`
- OpenAI: use raw `fetch()` to `https://api.openai.com/v1/...` — no SDK
- Never use `require()` or CommonJS
- Never import from `node:` or NPM directly

### Calling OpenAI in Edge Functions:
```typescript
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' }, // when you need JSON back
    messages: [
      { role: 'system', content: 'System prompt here.' },
      { role: 'user', content: 'User prompt here.' },
    ],
  }),
});
if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
const data = await res.json();
const result = JSON.parse(data.choices[0].message.content);
```

---

## Supabase Query Patterns

```typescript
// Read
const { data, error } = await supabase
  .from('business_opportunities')
  .select('id, title, description')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Read single row
const { data: row } = await supabase
  .from('validation_workflows')
  .select('product_proposal, reddit_validation_results')
  .eq('opportunity_id', opportunityId)
  .maybeSingle(); // use maybeSingle() not single() when row may not exist

// Insert
const { data: newRow, error } = await supabase
  .from('opportunity_chats')
  .insert({ opportunity_id: id, user_id: user.id })
  .select('id')
  .single();

// Update
await supabase
  .from('validation_workflows')
  .update({ product_proposal: proposalJson, updated_at: new Date().toISOString() })
  .eq('opportunity_id', opportunityId);

// Upsert
await supabase
  .from('reddit_discussions')
  .upsert({ post_id: id, ...data }, { onConflict: 'post_id,opportunity_id' });
```

---

## Paperclip API Patterns

```typescript
// All Paperclip calls use the shared pc() helper pattern:
async function pc(method: string, path: string, body?: object) {
  const res = await fetch(`${Deno.env.get('PAPERCLIP_API_URL')}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Paperclip ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// Valid Paperclip enum values (learned from live API):
// Project status: 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled'
// Agent role: 'ceo' | 'cto' | 'cmo' | 'cfo' | 'engineer' | 'designer' | 'pm' | 'qa' | 'devops' | 'researcher' | 'general'
// Issue priority: 'critical' | 'high' | 'medium' | 'low'
// Goal status: 'planned' | 'active' | 'achieved' | 'cancelled'
// Adapter type: 'http' | 'claude_local' | 'codex_local' | 'process'
```

---

## File Naming

| What | Convention |
|---|---|
| React components | PascalCase: `MyComponent.tsx` |
| Hooks | camelCase with `use` prefix: `useMyHook.ts` |
| Utilities | camelCase: `myUtil.ts` |
| Pages | PascalCase: `MyPage.tsx` |
| Edge Functions | kebab-case directories: `my-function/index.ts` |
| Constants | SCREAMING_SNAKE_CASE in `utils/constants.ts` |

---

## What NOT to do

- Never add `console.log` to React components — use `console.error` only for real errors
- Never use `any` type except in Edge Functions where Deno makes it unavoidable
- Never bypass shadcn/ui with raw HTML elements for UI pieces
- Never hardcode `https://phppdhsozkpsquxlfezg.supabase.co` in React — use `import.meta.env.VITE_SUPABASE_URL`
- Never store secrets in React code — they go in `.env` (frontend) or Supabase secrets (Edge Functions)
- Never create a new page without adding it as a lazy route in `App.tsx`
- Never use `className="text-white"` without a dark: counterpart — always use semantic tokens
