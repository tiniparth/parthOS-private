# Parth OS — Development Progress Log

_Chronological record of what was actually built/changed. Newest first. See [PRD.md](PRD.md) for the spec, [PLAN.md](PLAN.md) for the phase roadmap, [TASKS.md](TASKS.md) for live tasks._

---

## 2026-06-03 (pm) — Reliability fixes · retrospective spine · call-notes tool spun out
- **Fix — task due-dates:** the brain was baking resolved dates into task titles ("… — due 2026-06-04") with `due_date` left null. Tightened the create_task prompt (explicit `due_date` field, right/wrong example, "one date for a list applies to every task") + a deterministic backstop in `executeActions` that salvages a trailing "— due YYYY-MM-DD" into the field. Cleaned the 5 affected rows.
- **Calendar default — auto Meet link:** any event WITH attendees now auto-attaches a Google Meet link (`conferenceData` + `conferenceDataVersion=1`). Solo time-blocks unchanged. Both creation paths (Telegram brain + dashboard) funnel through one `createEvent`. Saved as a standing preference.
- **Retrospective spine (backend-only — for appraisal / resume / ISB):** new `milestones` table (append-only dated achievements) + `digests` table. Brain auto-detects genuine achievements (`log_milestone` — selective, transparent one-line note, never routine tasks). The weekly consolidate cron now ALSO reads the week's real activity (milestones, completed tasks, habits, spend, messages) and writes a "week in review" narrative to `digests` + sends it on Telegram. No dashboard clutter (per Parth's instruction). Report generator deferred — built when first needed; data accumulates from now. _SQL for `milestones` + `digests` run by Parth._
- **Call-recording → action items: SPUN OUT into a separate product.** A Telegram call pipeline was briefly built, then **reverted** — Parth wants this as a standalone, multi-user **web portal** for him + Workwise teammates (any-language). Scope locked: Google sign-in restricted to `@letsworkwise.com`, **"transcribe & extract" v1** (transcript + summary + action items + shareable per-meeting link), **separate repo / Supabase / Vercel**, all free tiers. Built in its own folder + Claude Code session (handoff brief delivered).
- **Process rule (Parth):** finalize scope with him *before* building a feature — not after.
- Open: scope **proactive nudges (#4)**; build the milestone **report generator** when first needed; (separate) the call-notes portal.

## 2026-06-03 — Product-leader pass: the "work core" + more modules
- **Clients/Pipeline** module (stage · next action · blocker · contact · last contact · priority), seeded with the 5 real clients from the Workwise Brain. Dark dropdown rendering fix (`color-scheme: dark` + custom select chevron) + stage-colored badges + high-priority accent.
- **People** (contacts directory), **Goals** (with progress bars), **Journal** (daily entries) modules added.
- Dashboard niceties: floating **+ quick-add FAB** (add anything → brain routes), **calendar invites with attendees** (sendUpdates=all), **task editing** (inline + one-tap Today/Tomorrow), **Expenses** upgrade (month nav + edit + category filter + vs-last-month), **mobile hamburger nav**, **search**, **bento Today** with streamed schedule/inbox + per-event done-marking, keep-warm Action.
- CRUD allowlist now covers clients/people/goals/journal. New tables: clients, people, goals, journal.
- Open: scope **proactive nudges (#4)** with Parth; memory/triage polish; cold-start.

## 2026-06-02 — Session close (built the whole thing in one day)
From "I want a personal assistant" → a live dual cloud+local personal OS on ₹0.
- **Cloud (Parth OS):** Telegram @tiniparth_bot (text+voice) + Next.js/Vercel + Supabase. Captures tasks/notes/facts/expenses/habits; daily briefing; `/inbox` `/find` `/doc` `/smart` `/fast`.
- **Brain:** migrated Gemini → **Groq** (free, reliable); `gpt-oss-120b` for rich answers; Whisper for voice.
- **Google:** Gmail triage, Calendar read+write (create events, schedule q's), Drive `/find`, Docs `/doc` generation, Sheets.
- **Dashboard:** full Tailwind/shadcn revamp — sidebar, bento **Today** (focus + web quick-capture + streamed schedule/inbox + event done-marking), **Tasks** (grouped + date filter), **Calendar** (agenda + add), **Mail** triage, **Expenses** (category bars), **Habits** (streak rings), Notes, Memory, **Search**; **PWA** (installable); keep-warm Action.
- **In-folder assistant:** Claude Code as chief-of-staff — `CLAUDE.md` (Parth OS + Workwise) + `/commands` + `scripts/os.mjs` bridge sharing the same Supabase brain.

### OPEN (next sessions)
- [ ] **Reconnect Google** (Mail → Reconnect) to grant the new doc-write scope so `/doc` works
- [ ] Confirm the 7am cron briefing fires
- [ ] Memory + triage + /find quality polish (Parth to define nudge areas)
- [ ] Proactive automation layer (nudges/digests via free GitHub Actions/cron)
- [ ] Calendar attendees (invite people); Gmail send (approve & send)
- [ ] Sheets → wire to a specific spreadsheet; running-plan mapping (when shared)
- [ ] Dashboard taste-tuning; cold-start (keep-warm partial)

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

**Brain migrated to Groq (free, no daily cap) — the big unlock**
- Discovered the Gemini key was capped at **20 requests/DAY** (not per-minute, not the ~1000 assumed) — unusable for daily use; lifting it required ₹1,000 refundable prepayment (no credit card option). Parth opted not to pay now.
- Switched the swappable brain to **Groq free tier**: `llama-3.3-70b-versatile` (default), `openai/gpt-oss-120b` (/smart), + **Whisper (whisper-large-v3-turbo)** for voice-note transcription. No card, ~thousands/day, ~30/min.
- New: `lib/brain/groq.ts` (OpenAI-compatible JSON-mode), `lib/voice.ts` (Whisper). All three brain callers (think, triage, briefing) now use Groq. Gemini code kept for swap-back when billing is enabled.
- Bug fixed: Llama nests action fields under the type name (`{create_event:{...}}`); added a normalizer in `executeActions` + an explicit flat-shape example in the prompt. Verified end-to-end: "block 30 mins tomorrow 5pm for ISB essay drafting" → calendar event created, **zero rate limits**.

**Dashboard revamp (Tailwind + shadcn/ui)**
- Stage 1: added Tailwind v4 + shadcn-style components (`Card`, `Button`, `Input`, `cn`), sidebar app shell (desktop sidebar + mobile top nav, active highlighting), rebuilt "Today" (stat tiles, 7-day schedule, inbox, habit glance).
- Stage 2: migrated `CrudTable` + all section pages (tasks/expenses/habits/notes/memory/mail) + ProfileEditor to the new system; added sonner toasts on add/save/delete. Legacy CSS kept underneath during transition.
- Chosen direction: sidebar command center, dark, clean. Iterative taste-tuning + ⌘K/filters/light-mode remain optional.

**Web dashboard added**
- Passcode-protected dashboard at `/dashboard` (login at `/login`; `DASHBOARD_PASSCODE` env; sha256 in httpOnly cookie, 30-day). Auth flow verified (no-cookie→redirect, wrong→401, correct→200).
- Shows: tasks (with mark-done toggle via `/api/tasks/done`), expenses (month total + by category + list), habits (last-7-day counts), recent notes, learned facts + full profile.
- Files: `lib/auth.ts`, `lib/dashboard.ts`, `app/login`, `app/dashboard`, `app/api/login`, `app/api/tasks/done`.

**Dashboard upgraded to full CRUD (Parth: "make it meaty / depth")**
- Generic CRUD API `app/api/crud/[table]` (auth + table/column allowlist) handles GET/POST/PATCH/DELETE for tasks, expenses, habit_logs, notes, memory_facts, profile.
- Reusable `CrudTable` client component (add/inline-edit/delete) + dashboard `layout.tsx` with section nav (Overview, Tasks, Expenses, Habits, Notes, Memory) + logout.
- Per-section pages + `ProfileEditor` (edit the "Who is Parth" doc from the web). Verified full create→update→delete cycle + 401 without auth.
