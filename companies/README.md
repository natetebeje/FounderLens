# FounderLens Companies

All companies managed under the FounderLens umbrella via Paperclip.

## Company Registry

| Company | Prefix | Type | Dashboard |
|---|---|---|---|
| [FounderLens Platform](./founderlens-platform/) | FOU | Platform (self) | [FOU dashboard](https://build.founderlens.io/FOU/dashboard) |
| [Beautuum](./beautuum/) | BEA | Standalone | [BEA dashboard](https://build.founderlens.io/BEA/dashboard) |
| Personalized Diet Plan SaaS | PER | Launched via validation flow | [PER dashboard](https://build.founderlens.io/PER/dashboard) |

## How Companies Work

Each company is an **isolated entity** in Paperclip with its own:
- Agents (CEO, CTO, Engineer, CMO, Growth, Brand)
- Projects, goals, and issue backlog
- Budget and spend tracking

### Two types of companies:

1. **Validation-flow companies** -- Created automatically by `launch-to-paperclip` edge function
   when a founder completes the FounderLens validation pipeline. These have an `opportunityId`
   linking them back to Supabase proposal/research data.

2. **Standalone companies** -- Created manually in Paperclip (like Beautuum and FounderLens Platform).
   No `opportunityId`. Agents get context purely from Paperclip (company info, goals, issues, skills).

## Directory Structure

```
companies/
  README.md                    # This file -- company registry
  founderlens-platform/
    paperclip-config.md        # IDs, agents, projects
  beautuum/
    README.md                  # Business overview
    paperclip-config.md        # IDs, agents, projects, backlog
```

## Paperclip Reference

See [docs/paperclip-reference.md](../docs/paperclip-reference.md) for API patterns,
environment variables, and operational details.
