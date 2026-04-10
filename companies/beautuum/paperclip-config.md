# Beautuum -- Paperclip Configuration

## Company

| Field | Value |
|---|---|
| Company ID | `18a86427-0462-42fb-b179-7cf590313ba0` |
| Name | beautuum |
| Issue Prefix | BEA |
| Dashboard | https://build.founderlens.io/BEA/dashboard |
| Status | active |
| Budget | $20/month cap |

## Goal

| Field | Value |
|---|---|
| Goal ID | `4548d012-3116-4cb1-b65a-3b72ec052f66` |
| Title | Beautuum: Skincare Brand Launch Report |
| Status | active |

## Agents

All agents use `adapterType: http` pointing at Supabase Edge Functions.
No `opportunityId` -- context is pulled purely from Paperclip (company, goals, issues, skills).

| Agent | Role | ID | Edge Function | Budget |
|---|---|---|---|---|
| CEO | ceo | `22075821-19a4-4e8a-a1d2-4e5bdd283ad6` | paperclip-agent-ceo | $6/mo |
| CTO | cto | `a57cac92-b74e-4b8e-a16c-861e873135c7` | paperclip-agent-cto | $5/mo |
| Engineer | engineer | `55ed2a6f-651a-4ade-94fa-0edf5fdc2bc4` | paperclip-agent-engineer | $4/mo |
| CMO | cmo | `d9fdc74c-7baa-41ef-86e9-e2611a4d92f9` | paperclip-agent-cmo | $3/mo |
| Growth | engineer | `8492b122-9dfa-4606-bc11-d4777588a4f1` | paperclip-agent-growth | $2/mo |
| Brand | general | `b5477ed4-f659-499e-992e-02f0d8975363` | paperclip-agent-branding | $2/mo |

### Org Chart

```
CEO
 +-- CTO
 +-- Engineer
 +-- CMO
 +-- Growth
 +-- Brand
```

## Projects

| Project | ID | Focus |
|---|---|---|
| Product Development | `721e1fd3-97e8-479a-adf1-bb20732aea76` | Core 4 product line, formulations, packaging |
| Marketing | `c8c7e084-4194-441a-a6a3-df3f6619a3f5` | TikTok content, influencer seeding, positioning |
| Operations | `6ab23840-6895-42e5-8cfe-4f083e00c072` | Shopify store, compliance, supply chain |

## Initial Backlog

| Issue | Title | Priority | Assignee | Project |
|---|---|---|---|---|
| BEA-2 | Source private-label manufacturer | critical | CTO | Product Development |
| BEA-3 | Finalize Core 4 product formulations | critical | CTO | Product Development |
| BEA-4 | Design minimalist recyclable packaging | high | Brand | Product Development |
| BEA-5 | Write positioning statement and landing page copy | critical | CMO | Marketing |
| BEA-6 | Launch founder-led TikTok content series | high | CMO | Marketing |
| BEA-7 | Build influencer seeding list (50-100 dermfluencers) | high | Growth | Marketing |
| BEA-8 | Set up Shopify DTC store with TikTok Shop | high | Engineer | Operations |
| BEA-9 | Establish dermatologist scientific advisor | high | CEO | Operations |
| BEA-10 | Business incorporation and compliance setup | medium | CEO | Operations |

## Adapter Config Template

Each agent's HTTP adapter is configured as:

```json
{
  "adapterType": "http",
  "adapterConfig": {
    "url": "https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/<edge-function-name>",
    "headers": {
      "apikey": "<SUPABASE_ANON_KEY>",
      "Authorization": "Bearer <SUPABASE_ANON_KEY>",
      "x-founderlens-opportunity-id": ""
    },
    "timeoutSec": 120
  }
}
```

**Note:** `x-founderlens-opportunity-id` is empty because beautuum is a standalone company
(not created via the FounderLens validation flow). The agent runtime handles this gracefully --
it skips loading proposal/research data from Supabase and relies on Paperclip context only.
