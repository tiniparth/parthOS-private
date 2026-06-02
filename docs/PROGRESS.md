# Parth OS — Development Progress Log

_Chronological record of what was actually built/changed. Newest first. See [PRD.md](PRD.md) for the spec, [PLAN.md](PLAN.md) for the phase roadmap, [TASKS.md](TASKS.md) for live tasks._

---

## 2026-06-02 — Day 1: MVP backbone built & deployed

**Phase 0 — Accounts & keys** ✅
- Telegram bot `@tiniparth_bot` created & token verified.
- Gemini API key verified (gemini-2.5-flash available).
- Supabase project `kvylsvvscpdzcbwqqaxm` created; URL + publishable + secret keys verified.
- GitHub repo `github.com/tiniparth/parthOS` set as remote.

**Phase 1 — Scaffold** ✅
- Lean Next.js 15 app (`Assistant/`), `lib/env.ts` + server-side `lib/supabase.ts`.
- `supabase/schema.sql` → tables `profile, memory_facts, captures, tasks, notes` (RLS on, no anon policies). All verified live.

**Phase 2 — Telegram pipe** ✅
- `/api/telegram` webhook (secret-token verification + chat-id allowlist, locked to `8675527310`).
- Deployed to Vercel (`workwise/parth-os`, prod URL `parth-os-liard.vercel.app`); webhook registered.

**Phase 3 — Brain + capture** ✅
- Gemini behind swappable `lib/brain` with structured JSON output; intent → create_task / create_note / remember_fact.
- Voice notes: download OGG from Telegram → Gemini transcribes + acts.
- Smoke-tested date resolution & action extraction.

**Phase 4 — Memory** ✅
- Seeded `profile` ("Who is Parth") from the Workwise Brain + existing session memory; sensitive items (salary, ISB odds, job-switch framing) excluded per Parth.

**Bugfixes during first live test**
- **504 timeouts / silent + duplicate replies:** webhook now returns 200 to Telegram instantly and does the work in `after()`. Cleared the stuck retry queue.
- **Gemini 429 (free-tier rate limit):** added 429/503 retry-with-backoff + a friendly "slow down" reply.
- **Runaway generation** (a 5k-char hallucinated task title): added `maxOutputTokens: 1024`, prompt constraints (terse, ≤100-char titles), and defensive length caps on save. Deleted the garbage row.

**Set up documentation system** (this commit): `PRD.md`, `PROGRESS.md`, `TASKS.md`; git synced to GitHub.

**Next:** Phase 5 — daily briefing (Vercel Cron).
