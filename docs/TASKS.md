# Parth OS — Live Task List

_The realtime task board. Updated as we work. `[ ]` open · `[~]` in progress · `[x]` done._
_High-level phases live in [PLAN.md](PLAN.md); this is the granular working list._

Last updated: 2026-06-02

---

## 🔴 In progress
- [~] Run `settings` table SQL (Parth) → enables persistent /smart /fast brain switching
- [~] Phase 3+4 live verification — Parth tests text + voice from phone (reliability fixes confirmed via simulated tests)

## 🟡 Up next
- [ ] **Phase 5 — Daily briefing**: `/api/cron/briefing` + Vercel Cron (7am IST) → today's tasks + nudges to Telegram
- [ ] Phase 6 polish: `/tasks` list, mark-done, cleaner reply formatting
- [ ] Push repo to GitHub remote and keep synced after each step

## 🟢 Backlog (post-MVP)
- [ ] Habit tracking (running, reading, yoga, journalling) + streaks
- [ ] Expense tracking (proper schema, not notes) — Parth already tried logging expenses
- [ ] Gmail integration (triage, draft replies, summarize)
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
- [x] Switchable brain: /smart (flash) · /fast (flash-lite) · /model (code shipped; needs settings SQL)
- [x] Set up docs system (PRD, PROGRESS, TASKS)
