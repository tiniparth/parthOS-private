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

**Rate-limit deep-dive (Gemini 429)**
- Root cause: Gemini free tier = **20 requests/minute** per project (`generate_content_free_tier_requests`). It was being tripped by overlapping burst testing (Parth's messages + Claude's diagnostic calls sharing the same per-minute budget). Initial backoff (1.5s/3s) was shorter than Google's requested ~6.7s retry, so retries gave up early.
- Fix: parse Google's requested retry delay and honour it (cap 12s), within the `after()` budget. Confirmed the bot processes successfully when the per-minute window has room.
- Note for daily use: a single user sending one message at a time stays well under 20/min. If bursts ever matter, upgrade the brain to a paid tier (no tight RPM) — already in backlog.

**Brain reliability + switchable model (Parth's request)**
- Discovered free-tier per-model quotas on this project: `gemini-2.5-flash` = **20/day** (too low), `gemini-2.0-flash` = **0** (no free quota), `gemini-2.5-flash-lite` = **~1000/day** (viable). flash-lite chosen as default daily driver.
- flash-lite intermittently looped a field past the token cap → truncated JSON (esp. emotive phrasings like "Pandit Sir"). Fixes: bump output cap to 4096, **regenerate on parse failure** (stochastic loop usually clears), salvage the reply as last resort, and a hard "no rambling about people" prompt rule. Verified: the previously-breaking message now creates a clean task.
- **Switchable brain** (Parth's idea): `settings` table + Telegram commands `/smart` (gemini-2.5-flash, ~20/day, meaty tasks), `/fast` (flash-lite, daily driver), `/model` (show current). Brain reads the active model per message; default flash-lite. Commands handled instantly (no quota spent). _Requires the `settings` table SQL to be run for the choice to persist._

**Expenses + Habits + Daily briefing shipped (MVP complete)**
- Expense tracking: `expenses` table, `log_expense` action (amount/item/category/date), monthly totals in context. Verified: "spent 250 on coffee + 80 on auto" → 2 rows.
- Habit tracking: `habit_logs` table, `log_habit` action (running/reading/yoga/journalling), 7-day summary in context. Verified: "went for a run" → logged.
- Phase 5 daily briefing: `/api/cron/briefing` (CRON_SECRET auth) + `vercel.json` cron `30 1 * * *` (07:00 IST). Weaves tasks + habits + spend into a warm brain-written message (plain fallback). Verified via manual trigger → delivered to Telegram.

**MVP COMPLETE.** Open polish: expense categories, /tasks + mark-done from chat, confirm cron fires tomorrow.
