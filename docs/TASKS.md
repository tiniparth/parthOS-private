# Parth OS — Live Task List

_The realtime task board. Updated as we work. `[ ]` open · `[~]` in progress · `[x]` done._
_High-level phases live in [PLAN.md](PLAN.md); this is the granular working list._

Last updated: 2026-06-02

---

## 🔴 In progress
- [~] Parth's daily real-world use of the MVP (text/voice capture, expenses, habits, briefing)

## 🟡 Up next
- [ ] Phase 6 polish: `/tasks` list + mark-done from chat, cleaner reply formatting
- [ ] Expense categories (model often leaves category null) + currency handling
- [ ] Confirm the 7am cron actually fires tomorrow morning

## 🟢 Backlog (post-MVP)
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
- [x] Switchable brain: /smart (flash) · /fast (flash-lite) · /model
- [x] Expense tracking (log_expense + monthly totals)
- [x] Habit tracking (log_habit + 7-day summary)
- [x] Phase 5 — daily briefing (Vercel Cron 07:00 IST; verified via manual trigger)
- [x] Set up docs system (PRD, PROGRESS, TASKS)
