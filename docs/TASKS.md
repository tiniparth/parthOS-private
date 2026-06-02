# Parth OS — Live Task List

_The realtime task board. Updated as we work. `[ ]` open · `[~]` in progress · `[x]` done._
_High-level phases live in [PLAN.md](PLAN.md); this is the granular working list._

Last updated: 2026-06-02

---

## 🔴 In progress
- [~] Parth's daily real-world use of the MVP

## ⭐ Known polish areas (dedicated passes later — flagged by Parth)
- [ ] **Memory + triage + context quality** — the whole memory model, email triage ranking, AND Drive `/find` search relevance all need real tuning (not a quick patch). They share the same root: how well the OS understands Parth's context. Currently first-cut. `/find` works but relevance/ranking needs polish.
- [x] **Dashboard revamp — DONE.** Tailwind v4 + shadcn-style, sidebar shell, purpose-built views for every domain: Today (command center w/ focus + web quick-capture), Tasks (grouped overdue/today/upcoming + quick-add), Calendar (agenda + add event), Mail (triage), Expenses (totals + category bars), Habits (streak rings), Notes, Memory. Toasts throughout. Iterative taste-tuning + ⌘K/light-mode still optional.

## 🟡 Up next
- [ ] **Granola (free tier)** — no API on free (API needs Business plan). Path: Zapier → Google Doc → Parth OS reads via Drive; or one-time manual pull. Pending Parth's choice.
- [ ] Confirm the 7am cron fires tomorrow morning
- [ ] Sheets: wire to a specific spreadsheet (e.g. expense tracker) — needs Parth to name the sheet
- [ ] Gmail *send* (approve-&-send drafts) — deferred; read-only for now

## 🟢 Backlog (post-MVP)
- [ ] **Proactive nudges** — DEFERRED until the triage polish; Parth will define the nudge areas then
- [ ] Strava — SKIPPED for now (per Parth)
- [ ] Google Calendar (create/read events from chat)
- [ ] Granola meeting-notes integration
- [ ] Proactive follow-ups ("you owed Siddharth X")
- [ ] Weekly review (habit streaks, expense rollup, task rollover)
- [ ] Upgrade brain Gemini → Claude (better quality; paid, no training on data)
- [ ] WhatsApp channel (later)

## ✅ Done
- [x] Phase 0 — accounts & keys (Telegram, Gemini, Supabase, GitHub)
- [x] Phase 1 — Next.js scaffold + Supabase schema (5 tables live)
- [x] Phase 2 — Telegram webhook, deployed to Vercel, locked to Parth's chat id
- [x] Phase 3 — Gemini brain: capture tasks/notes/facts + voice notes
- [x] Phase 4 — seeded "Who is Parth" profile into memory
- [x] Fix: webhook 504s → instant 200 + `after()` background processing
- [x] Fix: Gemini 429 rate-limit handling + runaway-generation guard
- [x] Fix: free-tier model quotas — switched default to flash-lite; regenerate-on-truncation for reliable JSON
- [x] Switchable brain: /smart (flash) · /fast (flash-lite) · /model
- [x] Expense tracking (log_expense + monthly totals)
- [x] Habit tracking (log_habit + 7-day summary)
- [x] Phase 5 — daily briefing (Vercel Cron 07:00 IST; verified via manual trigger)
- [x] Web dashboard (passcode-protected): tasks+mark-done, expenses, habits, notes, memory
- [x] Full-CRUD dashboard + daily command-center overview (calendar + inbox + inline CRUD)
- [x] Gmail (read-only) connected + contextual triage (Mail page, /inbox, briefing)
- [x] Google Calendar (read-only) connected — today/tomorrow on overview
- [x] Google expansion: Drive (/find), Docs read, Sheets read+write, Calendar create (create_event action) — all scopes granted & verified
- [x] Brain swapped to Groq (free, reliable) + Whisper voice; rich formatted answers
- [x] Brain reads calendar (next 7 days) for schedule questions; calendar write works on demand
- [x] Set up docs system (PRD, PROGRESS, TASKS)
