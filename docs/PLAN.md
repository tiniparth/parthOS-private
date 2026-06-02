# Parth OS — Assistant · Build Plan

_Frozen goal + architecture + phased task breakdown. This is the single source of truth for the build._

Last updated: 2026-06-02

---

## 1. The Frozen Goal (north star)

> **Parth OS** is a personal assistant I reach from my phone (Telegram, text **or** voice)
> that has **one persistent memory** of who I am and what's going on — so I capture anything
> in 5 seconds and **never re-explain myself**.
>
> It tracks my **tasks, habits, expenses, and notes**, gives me a **daily briefing**, and
> (later) plugs into **Gmail, Calendar, and meeting notes**.

### Why we're building it (the root problem)
Everything I do is spread across Gmail, Docs, Sheets, WhatsApp, 1:1s, and my own head — and
every AI chat I use has its own amnesia, so I repeat my context constantly. To note or finish
anything I have to open the PC and manually file it. **Parth OS fixes this with two things:**
1. **One brain** — a persistent memory that always knows who I am.
2. **One door** — reachable from my phone by text/voice, zero friction to capture.

---

## 2. Stack (all free tier)

| Layer        | Choice                          | Why |
|--------------|---------------------------------|-----|
| Interface    | **Telegram bot (webhook)**      | Free, instant, native voice notes. Webhook = perfect fit for serverless. |
| App / API    | **Next.js 15 on Vercel**        | Same stack as Globose; free Hobby tier. |
| Memory / DB  | **Supabase (Postgres)**         | Same as Globose; free tier. Single source of truth. |
| Brain (LLM)  | **Gemini Flash (free tier)**    | Free API + understands voice natively. Behind a **swappable interface** → upgrade to Claude later. |
| Scheduling   | **Vercel Cron**                 | Free; runs the daily briefing. |
| Voice        | **Gemini audio** (Telegram OGG) | Transcribe + understand in one call, no extra service. |

### Architecture
```
  Phone (Telegram: text + voice)
        │  webhook push
        ▼
  Next.js API route on Vercel  ──►  Brain (Gemini, swappable)
        │                               │ intent + reply
        ▼                               ▼
  Supabase Postgres  ◄───────────  memory · tasks · notes · captures
        ▲
        │ daily 7am IST
  Vercel Cron → /api/cron/briefing → Telegram morning message
```

### Security
- Telegram webhook verified via secret token header.
- **Allowlist**: bot only responds to Parth's `chat_id`. Ignores everyone else.
- Service-role key server-side only (same pattern as Globose `adminClient()`).

---

## 3. Data model (MVP tables in Supabase)

- **`profile`** — the "who is Parth" doc: role, work, personality, preferences, people (Siddharth, etc.), timezone. Loaded into every brain call.
- **`memory_facts`** — durable facts the assistant learns over time (text + category + created_at).
- **`captures`** — raw log of every inbound message (text or voice transcript) for audit/replay.
- **`tasks`** — title, status (open/done), due_date, priority, source, created_at, done_at.
- **`notes`** — content, tags, created_at.
- _(stubbed for later: `habits`, `habit_logs`, `expenses`)_

---

## 4. Phased task breakdown

> Build order favors **something useful in-hand fast**, then layering. Each phase ends in a verifiable check.

### Phase 0 — Accounts & keys ✅ DONE
- [x] Telegram bot **@tiniparth_bot** → token verified
- [x] **Supabase** project `kvylsvvscpdzcbwqqaxm` → URL + publishable + secret keys verified
- [x] **Gemini** API key verified (gemini-2.5-flash available)
- [x] GitHub repo: github.com/tiniparth/parthOS
- [ ] Vercel link (deferred to deploy step)

### Phase 1 — Scaffold
- [x] Next.js 15 app scaffolded in `Parth OS\Assistant` (lean, builds ✅)
- [x] `src/lib/env.ts` + `src/lib/supabase.ts` (server service-role client)
- [x] `.env.local` wired with all keys; `.gitignore` protects secrets
- [x] `supabase/schema.sql` written (profile, memory_facts, captures, tasks, notes)
- [ ] **Run schema.sql in Supabase** ← current step
- ✅ _Check: app builds (done); DB tables exist (pending schema run)._

### Phase 2 — Telegram pipe (echo) ✅ DONE
- [x] `/api/telegram` webhook: verify secret, allowlist chat_id (locked to 8675527310)
- [x] Deployed to Vercel (prod URL: parth-os-liard.vercel.app) + webhook registered
- [x] _Verified: bot replied with chat id ✅_

### Phase 3 — Brain + capture (the core) ✅ BUILT (awaiting Parth's live test)
- [x] Gemini integration behind `lib/brain` (swappable) — structured JSON output
- [x] Intent routing: task / note / fact via structured actions
- [x] Voice notes: download OGG from Telegram → Gemini transcribes + acts
- [x] Writes to `tasks`/`notes`/`memory_facts`; loads `profile`+facts+open tasks each call
- [x] Smoke-tested: date resolution + action extraction confirmed
- [ ] **Parth's live test from phone** ← current step
- ✅ _Check: voice note "remind me to send Siddharth the deck Friday" → task created, smart reply._

### Phase 4 — Memory ("never re-explain")
- [ ] Seed `profile` with who-is-Parth
- [ ] Commands to view/add/update memory from the phone
- ✅ _Check: ask "what do you know about me?" → accurate; it uses context in replies._

### Phase 5 — Daily briefing
- [ ] `/api/cron/briefing` + Vercel cron (7am IST) → today's tasks + nudges to Telegram
- ✅ _Check: receive a morning briefing on my phone._

### Phase 6 — Polish
- [ ] `/tasks`, mark-done, quick edits, nicer formatting
- ✅ _Check: full daily loop feels smooth._

---

## 5. Later (post-MVP backlog)
Habits (running, reading, yoga, journalling) · Expense tracking · Gmail triage/drafts ·
Calendar create/read · Granola meeting notes · Proactive follow-ups ("you owed Siddharth X") ·
Weekly review · WhatsApp channel · upgrade brain to Claude.
