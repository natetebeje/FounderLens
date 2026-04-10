# FounderLens Platform -- Paperclip Configuration

## Company

| Field | Value |
|---|---|
| Company ID | `a157b6e0-8dda-47c5-97d9-1677b1388762` |
| Name | FounderLens Platform |
| Issue Prefix | FOU |
| Dashboard | https://build.founderlens.io/FOU/dashboard |
| Status | active |
| Budget | $30/month |

## Description

The FounderLens product itself -- the AI incubator platform at founderlens.io.

- **Stack:** React 18 + Vite + TypeScript + Supabase + shadcn/ui + Tailwind + Deno Edge Functions
- **Repo:** natetebeje/FounderLens (main branch)
- **Deployed:** founderlens.io (VPS 31.97.146.40, /opt/deploy-founderlens.sh)
- **Paperclip:** build.founderlens.io

## Agents

| Agent | Role | ID | Edge Function | Budget |
|---|---|---|---|---|
| CEO | ceo | `f0289030-1cb5-466a-b0cf-aac9cd371edc` | paperclip-agent-ceo | $6/mo |
| CTO | cto | `8e699b53-1a3d-4f84-985f-a8e5c5555c27` | paperclip-agent-cto | $5/mo |
| Engineer | engineer | `90db524f-38fb-4b39-8cfa-d4862c0ea954` | paperclip-agent-engineer | $5/mo |
| CMO | cmo | `fc4fcdf3-9482-4c24-958b-dab7382205df` | paperclip-agent-cmo | $3/mo |
| Growth | engineer | `c024aed2-465d-430f-9fb3-7bf0bbdb429e` | paperclip-agent-growth | $2/mo |

### Org Chart

```
CEO (f0289030)
 +-- CTO (8e699b53)
 +-- Engineer (90db524f)
 +-- CMO (fc4fcdf3)
 +-- Growth (c024aed2)
```
