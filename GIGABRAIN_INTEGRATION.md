# FounderLens × GigaBrain Integration

## What changed

### Problem
FounderLens's Reddit validation was silently returning empty results because:
- Reddit's public JSON API (`www.reddit.com/search.json`) blocks all datacenter IPs with **403 Forbidden**
- This broke `reddit-discussion-extractor` and `validate-opportunity-research` in Supabase Edge Functions
- The validation step would show 0 community data, making the feature unusable

### Solution (GigaBrain strategy)
- **Primary:** Reddit OAuth API (`oauth.reddit.com`) — works from any server when `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` are configured
- **Fallback:** [PullPush.io](https://api.pullpush.io) — community Pushshift mirror that works from Deno/cloud without credentials
- The fallback activates automatically when Reddit credentials are missing — zero config needed for basic operation

---

## Files Changed

### Supabase Edge Functions
| File | Change |
|---|---|
| `supabase/functions/reddit-discussion-extractor/index.ts` | Full rewrite — OAuth + PullPush fallback + FounderLens-branded AI summarization |
| `supabase/functions/validate-opportunity-research/index.ts` | Reddit search section replaced with unified OAuth/PullPush strategy |
| `supabase/functions/reddit-test/index.ts` | Upgraded to test all three services (PullPush, Reddit OAuth, OpenAI) |

### React Components
| File | Change |
|---|---|
| `src/components/CommunityResearchResults.tsx` | Full rewrite — GigaBrain-style UI: TLDR, demand signals, pain points, source posts with links |
| `src/components/SimplifiedValidationSignals.tsx` | Patched to call `reddit-discussion-extractor` alongside `validate-opportunity-research` and pass both result shapes to `CommunityResearchResults` |

---

## Required Environment Variables

Set these in your Supabase project: **Dashboard → Settings → Edge Functions → Secrets**

### Minimum (basic Reddit search via PullPush — no credentials needed)
```
OPENAI_API_KEY=sk-proj-...your-key...
```

### Recommended (full Reddit search via OAuth)
```
OPENAI_API_KEY=sk-proj-...your-key...
REDDIT_CLIENT_ID=your_app_client_id
REDDIT_CLIENT_SECRET=your_app_secret
```

---

## How to get Reddit OAuth credentials (free, 2 minutes)

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click **Create App** → choose **script** type
3. Fill in any name (e.g., "FounderLens Validation")
4. Set redirect URI: `http://localhost:8080` (not used, just required)
5. Submit — copy your **Client ID** (under the app name) and **Client Secret**

With these set, Reddit search returns live, high-relevance results with proper full-text search. Without them, PullPush is used automatically.

---

## Testing

After deploying, test the Reddit connectivity via Supabase Edge Function logs or call:

```
POST https://<your-project>.supabase.co/functions/v1/reddit-test
Content-Type: application/json
Authorization: Bearer <anon-key>

{ "query": "best project management app" }
```

Expected response:
```json
{
  "success": true,
  "message": "✅ Reddit search working — 5 posts found via PullPush",
  "diagnostics": {
    "pullpush": { "ok": true, "postsFound": 5, "latencyMs": 420 },
    "openai": { "ok": true, "latencyMs": 380 }
  }
}
```

---

## How validation now works

```
User clicks "Run Validation"
    ↓
run-automated-validation     ← AI market analysis (competitors, TAM, SWOT)
    ↓
validate-opportunity-research ← Multi-source research (HN + Reddit + web forums)
    └─ Reddit: OAuth → PullPush fallback (GigaBrain strategy)
    ↓
reddit-discussion-extractor  ← Direct Reddit posts + AI TLDR summary
    └─ Reddit: OAuth → PullPush fallback
    ↓
CommunityResearchResults     ← Shows: TLDR, demand signals, pain points, source posts
```
