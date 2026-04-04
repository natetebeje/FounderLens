# Phase 2 — Paperclip Server Deployment Guide

## Overview

Phase 2 deploys a shared Paperclip instance that FounderLens connects to when a founder launches their AI company. Each user's business is an isolated Paperclip "company" within the shared instance.

## Step 1 — Deploy Paperclip on Railway

### Option A: Railway (Recommended — one-click, $5/mo)

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Deploy from GitHub repo** → select `paperclipai/paperclip`
3. Set the following environment variables in Railway:

```env
NODE_ENV=production
PORT=3100
DATABASE_URL=<Railway Postgres URL — auto-provided>
NEXTAUTH_SECRET=<random 32-char string>
NEXTAUTH_URL=https://your-paperclip-app.railway.app
PAPERCLIP_MASTER_TOKEN=<generate a secure random token>
```

4. Add a **Postgres** plugin to the Railway project (free tier available)
5. Deploy — Railway builds the Node.js app and exposes port 3100

### Option B: Render (Free tier available)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect `paperclipai/paperclip` repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Set the same environment variables as above
6. Add a **Render Postgres** database

---

## Step 2 — Store Config in Supabase Secrets

Once Paperclip is deployed, store its URL and token in Supabase:

```bash
supabase secrets set PAPERCLIP_API_URL=https://your-paperclip-app.railway.app
supabase secrets set PAPERCLIP_MASTER_TOKEN=your-secure-token
```

These will be available in all Edge Functions via `Deno.env.get('PAPERCLIP_API_URL')`.

---

## Step 3 — Configure HTTP Adapter Endpoints

The HTTP adapter lets Paperclip call Supabase Edge Functions as agent runtimes.

Each agent in the company template uses `adapter: http`. When Paperclip triggers a heartbeat, it POSTs to the configured URL.

Register each agent's webhook URL in Paperclip:

| Agent | Edge Function URL |
|---|---|
| CEO | `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-ceo` |
| CTO | `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-cto` |
| Engineer | `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-engineer` |
| CMO | `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-cmo` |
| Growth | `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-growth` |

---

## Step 4 — Validate API Connectivity

Test that Supabase Edge Functions can reach Paperclip:

```bash
curl -X GET https://your-paperclip-app.railway.app/api/companies \
  -H "Authorization: Bearer your-master-token"
```

Expected response: `{"companies": []}` (empty on fresh deploy)

Test from within a Supabase Edge Function (deploy a test function):

```typescript
const res = await fetch(`${Deno.env.get('PAPERCLIP_API_URL')}/api/companies`, {
  headers: { Authorization: `Bearer ${Deno.env.get('PAPERCLIP_MASTER_TOKEN')}` }
});
console.log(await res.json());
```

---

## Step 5 — Update validation_workflows Table

Add the `paperclip_company_id` column to store launched company references:

```sql
ALTER TABLE validation_workflows
  ADD COLUMN IF NOT EXISTS paperclip_company_id text,
  ADD COLUMN IF NOT EXISTS paperclip_launched_at timestamptz;
```

(Applied via Supabase MCP migration in Phase 3 kickoff)

---

## Phase 2 Checklist

- [ ] Paperclip deployed and accessible (Railway or Render)
- [ ] `PAPERCLIP_API_URL` set in Supabase secrets
- [ ] `PAPERCLIP_MASTER_TOKEN` set in Supabase secrets
- [ ] HTTP adapter endpoints registered in Paperclip config
- [ ] API connectivity validated from Edge Function environment
- [ ] `founderlens-companies` template repo public at `natetebeje/founderlens-companies` ✓ (done)
- [ ] `paperclip_company_id` column migration ready for Phase 3

---

## Next: Phase 3

Once Paperclip is deployed and reachable, Phase 3 builds the `launch-to-paperclip` Edge Function that:
1. Reads the Product Proposal from DB
2. Instantiates the company template (fills all `{{PLACEHOLDER}}` fields)
3. Creates the company, agents, projects, and skills via Paperclip REST API
4. Returns the Paperclip dashboard URL to the FounderLens UI

See [GitHub Issue #1](https://github.com/natetebeje/FounderLens/issues/1) for the full roadmap.
