# Parth OS — Product Requirements (PRD)

_The "what & why". For the phased build sequence see [PLAN.md](PLAN.md); for the running log see [PROGRESS.md](PROGRESS.md); for live tasks see [TASKS.md](TASKS.md)._

Owner: Parth Parmar · Started: 2026-06-02 · Status: MVP in progress

---

## 1. Problem
Parth's context, decisions, and to-dos are scattered across Gmail, Docs, Sheets, WhatsApp, 1:1s, and his own head — and every AI chat has its own amnesia, so he re-explains himself constantly. Capturing or finishing anything means opening the PC and manually filing it. High friction → things slip.

## 2. Goal (north star)
> A personal assistant Parth reaches from his phone (Telegram, text **or** voice) that has **one persistent memory** of who he is and what's going on — so he captures anything in 5 seconds and **never re-explains himself**.

It tracks **tasks, habits, expenses, and notes**, gives a **daily briefing**, and (later) plugs into **Gmail, Calendar, and meeting notes**.

## 3. User
Single user: Parth (founding-member/Growth at Workwise; ISB-MBA aspirant; runner). Non-technical builder who steers AI. The assistant must already know his work (Workwise + client board), goals (ISB), and personal context.

## 4. Principles
- **One brain, one door.** A single source of truth + a single mobile entry point.
- **Zero-friction capture.** Voice or text; the assistant classifies — Parth doesn't.
- **Proactive, not just reactive.** Briefings, nudges, follow-ups.
- **Honest & concise.** Talks like a sharp chief-of-staff; pushes back when he drifts.

## 5. Scope
**In (MVP):** Telegram interface (text+voice) · capture → tasks/notes/facts · persistent profile/memory · daily briefing.
**Next:** habits (running, reading, yoga, journalling) · expense tracking · Gmail · Calendar · Granola meeting notes · proactive follow-ups · weekly review.
**Out (for now):** WhatsApp channel · multi-user · a rich web UI (Telegram is the interface; the web app is just the engine room).

## 6. Architecture & stack (all free tier)
- **Interface:** Telegram bot via webhook (`@tiniparth_bot`).
- **App/API:** Next.js 15 on Vercel (prod: `parth-os-liard.vercel.app`).
- **Memory/DB:** Supabase Postgres (ref `kvylsvvscpdzcbwqqaxm`).
- **Brain:** Gemini 2.5 Flash (free), behind a swappable `lib/brain` interface (→ Claude later).
- **Scheduling:** Vercel Cron (daily briefing).
- **Voice:** Gemini native audio (Telegram OGG).
- Webhook responds 200 instantly; heavy work runs in `after()` to avoid Telegram timeouts.

## 7. Success criteria
- Parth texts/voices the bot and it captures correctly + replies in a few seconds.
- "What do you know about me?" returns accurate personal/work context.
- A daily briefing arrives each morning.
- Parth actually uses it daily instead of scattered tools.
