# Paperclip Reference

Centralized reference for the Paperclip deployment powering FounderLens AI companies.

## Instance

| Field | Value |
|---|---|
| URL | https://build.founderlens.io |
| Port | 3100 |
| Board API Key env var | `PAPERCLIP_BOARD_API_KEY` |
| Supabase env var | `PAPERCLIP_API_URL` |

## Environment Variables (Supabase Secrets)

These are set via `supabase secrets set` and available in all Edge Functions:

| Variable | Purpose |
|---|---|
| `PAPERCLIP_API_URL` | `https://build.founderlens.io` |
| `PAPERCLIP_BOARD_API_KEY` | Board operator key for REST API |
| `OPENAI_API_KEY` | Used by agent runtime for GPT-4o thinking |
| `SUPABASE_URL` | `https://phppdhsozkpsquxlfezg.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key for Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |

## API Patterns

Base URL: `https://build.founderlens.io/api`

All requests require: `Authorization: Bearer <PAPERCLIP_BOARD_API_KEY>`

### Companies

```
GET    /api/companies                          # List all companies
GET    /api/companies/:id                      # Get company details
POST   /api/companies                          # Create company
```

### Agents

```
GET    /api/companies/:companyId/agents        # List agents in company
GET    /api/agents/:agentId                    # Get agent details
POST   /api/companies/:companyId/agents        # Create agent
PATCH  /api/agents/:agentId                    # Update agent (adapter, config, etc.)
```

### Goals

```
GET    /api/companies/:companyId/goals         # List goals
POST   /api/companies/:companyId/goals         # Create goal
PATCH  /api/goals/:goalId                      # Update goal
```

### Projects

```
GET    /api/companies/:companyId/projects      # List projects
POST   /api/companies/:companyId/projects      # Create project
```

### Issues

```
GET    /api/companies/:companyId/issues        # List issues (filter: ?status=todo,in_progress)
GET    /api/issues/:issueId                    # Get issue
POST   /api/companies/:companyId/issues        # Create issue
PATCH  /api/issues/:issueId                    # Update issue
POST   /api/issues/:issueId/checkout           # Checkout issue for agent
POST   /api/issues/:issueId/release            # Release issue
POST   /api/issues/:issueId/comments           # Add comment
```

### Skills (Agent Knowledge Base)

```
GET    /api/companies/:companyId/skills        # List skills
POST   /api/companies/:companyId/skills        # Create skill
```

### Org Chart

```
GET    /api/companies/:companyId/org           # Get org chart
```

## Agent Adapter Types

| Type | Description |
|---|---|
| `http` | Calls an external URL (Supabase Edge Function) on heartbeat. Used for all FounderLens agents. |
| `claude_local` | Runs Claude locally within Paperclip. Default when creating agents in the UI. |

### HTTP Adapter Config

```json
{
  "adapterType": "http",
  "adapterConfig": {
    "url": "https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/<function-name>",
    "headers": {
      "apikey": "<SUPABASE_ANON_KEY>",
      "Authorization": "Bearer <SUPABASE_ANON_KEY>",
      "x-founderlens-opportunity-id": "<opportunityId or empty>"
    },
    "timeoutSec": 120
  }
}
```

## Edge Functions (Agent Runtimes)

Each agent role has a dedicated Supabase Edge Function:

| Function | Path | Agent Role |
|---|---|---|
| paperclip-agent-ceo | `supabase/functions/paperclip-agent-ceo/` | CEO |
| paperclip-agent-cto | `supabase/functions/paperclip-agent-cto/` | CTO |
| paperclip-agent-engineer | `supabase/functions/paperclip-agent-engineer/` | Engineer |
| paperclip-agent-cmo | `supabase/functions/paperclip-agent-cmo/` | CMO |
| paperclip-agent-growth | `supabase/functions/paperclip-agent-growth/` | Growth |
| paperclip-agent-branding | `supabase/functions/paperclip-agent-branding/` | Brand |

Shared runtime: `supabase/functions/_shared/agent-runtime.ts`

### How Agent Heartbeats Work

1. Paperclip triggers a heartbeat on schedule (default: every 3600s)
2. Paperclip POSTs to the agent's HTTP adapter URL with `{ runId, agentId, companyId, context }`
3. Edge function loads context from Paperclip (company, agents, goals, issues, skills)
4. If `x-founderlens-opportunity-id` is set, also loads proposal/research from Supabase
5. Sends context to GPT-4o, gets back structured actions (create/update issues, comments, goals)
6. Executes actions against Paperclip API
7. Returns summary to Paperclip

### Standalone vs. Validation-Flow Companies

- **Validation-flow:** Has `opportunityId` -> agents load proposal + research from Supabase
- **Standalone:** No `opportunityId` -> agents rely on Paperclip context only (company, goals, issues, skills)

Both types use the same edge functions. The runtime handles missing `opportunityId` gracefully.

## Issue Priority Values

`critical` | `high` | `medium` | `low`

## Issue Status Values

`todo` | `in_progress` | `done` | `blocked`

## Goal Status Values

`planned` | `active` | `achieved` | `cancelled`

## Agent Role Values

`ceo` | `cto` | `cmo` | `cfo` | `engineer` | `designer` | `pm` | `qa` | `devops` | `researcher` | `general`

## Company Registry

See [companies/README.md](../companies/README.md) for the full list of companies and their configs.
