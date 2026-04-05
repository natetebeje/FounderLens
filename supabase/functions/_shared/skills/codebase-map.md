# Skill: FounderLens Codebase Map

This skill gives you a complete map of the FounderLens codebase so you can generate accurate code without guessing file names, import paths, or component APIs.

---

## Repository

- **GitHub**: `natetebeje/FounderLens`
- **Branch**: `main`
- **Stack**: Vite 5 + React 18 + TypeScript + Supabase + shadcn/ui + Tailwind CSS
- **Deployed**: `https://founderlens.io` (Hostinger VPS, nginx, `/var/www/founderlens/`)
- **Deploy command**: SSH to `root@31.97.146.40` → run `/opt/deploy-founderlens.sh`

---

## Directory Structure

```
src/
  App.tsx                    ← React Router routes + lazy loading
  main.tsx                   ← Entry point, ThemeProvider, AuthProvider
  index.css                  ← Global styles, Tailwind base
  pages/                     ← Route-level page components (lazy loaded)
  components/                ← Reusable UI components
    ui/                      ← shadcn/ui primitives (Button, Card, Badge, etc.)
    build/                   ← Build tab sub-components
    admin/                   ← Admin panel sub-components
    content/                 ← Blog/stories/ideas sub-components
    enhanced/                ← Error boundaries, loading states
  hooks/                     ← Custom React hooks
  contexts/                  ← AuthContext, ThemeContext, WorkspaceContext
  integrations/supabase/     ← Supabase client + generated types
  utils/                     ← Pure utility functions
supabase/
  functions/                 ← Supabase Edge Functions (Deno TypeScript)
    _shared/                 ← Shared modules imported by multiple functions
      agent-runtime.ts       ← Paperclip API client, GPT-4o caller, action executor
      skills/                ← Skill files for Paperclip agents (this directory)
```

---

## Key Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/Index.tsx` | Landing page (Hero, Features, WhyFounderLens, Pricing) |
| `/discovery` | `pages/Discovery.tsx` | AI opportunity discovery feed |
| `/opportunities` | `pages/Opportunities.tsx` | User's saved opportunities list |
| `/validation/:id` | `pages/ValidationWorkflow.tsx` | Full validation page for one opportunity |
| `/build` | `pages/BuildLab.tsx` | Two tabs: My Companies + Learn courses |
| `/build/:slug` | `pages/BuildTrack.tsx` | Course track page |
| `/build/:slug/:lesson` | `pages/BuildLesson.tsx` | Individual lesson page |
| `/auth` | `pages/Auth.tsx` | Login/signup |
| `/onboarding` | `pages/Onboarding.tsx` | New user onboarding flow |
| `/profile` | `pages/Profile.tsx` | User profile |
| `/settings` | `pages/Settings.tsx` | App settings |
| `/admin` | `pages/Admin.tsx` | Admin dashboard (is_admin=true only) |
| `/pricing` | `pages/Pricing.tsx` | Pricing/subscription page |

---

## Critical Components

### Validation page components
- `SimplifiedValidationSignals.tsx` — THE main validation UI. Orchestrates the research engine. Contains `loadPersistedData()`, `OpportunityChat`, `ResearchReport`, score display. **Most complex component in the app.**
- `ResearchReport.tsx` — Brief + full report display with verdict badge
- `OpportunityChat.tsx` — Idea Coach chat panel (streaming SSE, Build This button, SkillsPicker)
- `ProductProposalModal.tsx` — 10-section proposal modal with 3 tabs
- `SkillsPicker.tsx` — skills.sh integration picker

### AI Companies
- `AICompaniesTab.tsx` — Embeds inside BuildLab. Company cards with live Paperclip data.
- `hooks/useAICompanies.ts` — Data hook: loads from Supabase + Paperclip API in parallel

### Landing page
- `HeroSection.tsx` — Main hero
- `FeaturesSection.tsx` — Feature grid
- `WhyFounderLens.tsx` — Three differentiators vs ChatGPT (NEW)
- `PricingSection.tsx` — Pricing cards

### Auth / Data
- `contexts/AuthContext.tsx` — `useAuth()` hook source — provides `user`, `session`, `signIn`, `signOut`
- `contexts/WorkspaceContext.tsx` — `useWorkspace()` — provides `organization`, `currentOrg`
- `hooks/useSubscription.ts` — `useSubscription()` → `{ subscribed, planTier, loading }`
- `integrations/supabase/client.ts` — `import { supabase } from '@/integrations/supabase/client'`

---

## Supabase Edge Functions

### Core research pipeline
| Function | Version | Purpose |
|---|---|---|
| `validate-opportunity-research` | v16 | Main research engine: AI search plan → 5 parallel searches → GPT-4o synthesis → DB write → CEO webhook |
| `reddit-discussion-extractor` | v9 | Two-pass PullPush Reddit search with keyword relevance filter |
| `opportunity-chat` | v1 | Streaming GPT-4o Idea Coach with persistent chat history |
| `notify-ceo-new-signals` | v1 | Post-launch: creates Paperclip briefing issue + triggers CEO heartbeat |

### Paperclip integration
| Function | Purpose |
|---|---|
| `launch-to-paperclip` | Creates Paperclip company from Product Proposal (6 agents, 3 projects, skills) |
| `fetch-skills-for-company` | GPT-4o skill recommender + GitHub raw SKILL.md fetcher + Paperclip injector |
| `paperclip-agent-ceo` | CEO heartbeat runtime |
| `paperclip-agent-cto` | CTO heartbeat runtime |
| `paperclip-agent-engineer` | Engineer heartbeat runtime |
| `paperclip-agent-cmo` | CMO heartbeat runtime |
| `paperclip-agent-growth` | Growth heartbeat runtime |
| `paperclip-agent-branding` | Brand Agent: names + RDAP domain check + color palette |

### Other functions
| Function | Purpose |
|---|---|
| `generate-opportunities` | AI discovery — generates opportunity ideas |
| `generate-mvp-with-lovable` | MVP scaffolding via Lovable API |
| `create-checkout` / `customer-portal` | Stripe subscription management |
| `check-subscription` | Validates user subscription status |
| `contact-form-submit` | Contact form handler |

---

## Key Database Tables (most important for development)

| Table | Purpose |
|---|---|
| `business_opportunities` | User's opportunities. FK: `user_id`, `organization_id` |
| `validation_workflows` | One per opportunity. Has `reddit_validation_results` (JSONB), `product_proposal` (JSONB), `paperclip_company_id` |
| `opportunity_chats` | One per user per opportunity for Idea Coach |
| `opportunity_chat_messages` | Full chat history. FK: `chat_id` |
| `reddit_discussions` | Relevant Reddit posts found during research |
| `profiles` | User profile. `is_admin` boolean here |
| `subscriptions` | Stripe subscription data |
| `subscription_cache` | Cached subscription status for fast reads |
| `organizations` | Workspaces/teams |
| `organization_members` | Team membership |
| `build_tracks` + `build_lessons` | Course content |
| `lesson_progress` | User course progress |

---

## Import Paths

```typescript
// Supabase client
import { supabase } from '@/integrations/supabase/client';

// UI components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner'; // or: import { useToast } from '@/hooks/use-toast';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

// Icons (always from lucide-react)
import { ArrowRight, Loader2, Check, X } from 'lucide-react';
```

---

## Shared Agent Runtime (for Edge Functions)

```typescript
// Import from _shared in other Edge Functions:
import {
  corsHeaders,
  PaperclipClient,
  loadAgentContext,
  thinkAndAct,
  executeActions,
  formatIssueList,
  formatSkills,
} from '../_shared/agent-runtime.ts';
```

---

## Environment Variables (Supabase secrets)

| Key | Used by |
|---|---|
| `OPENAI_API_KEY` | All AI functions |
| `PAPERCLIP_API_URL` | `https://build.founderlens.io` |
| `PAPERCLIP_BOARD_API_KEY` | Board operator key for Paperclip REST API |
| `SUPABASE_URL` | All Edge Functions (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | All Edge Functions (auto-injected) |
| `SUPABASE_ANON_KEY` | Auth-scoped operations (auto-injected) |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Reddit OAuth (fallback) |

---

## GitHub Secrets (for Engineer agent PRs)

| Key | Value |
|---|---|
| `GITHUB_TOKEN` | Personal access token with `repo` scope for `natetebeje/FounderLens` |
| Repo | `natetebeje/FounderLens` |
| Default branch | `main` |
