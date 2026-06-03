-- Parth OS — MVP schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";

-- The single "who is Parth" profile (one row, freeform markdown).
create table if not exists profile (
  id          uuid primary key default gen_random_uuid(),
  content     text not null default '',
  updated_at  timestamptz not null default now()
);

-- Durable facts the assistant learns over time.
create table if not exists memory_facts (
  id          uuid primary key default gen_random_uuid(),
  category    text,                        -- work | people | preference | personal | ...
  fact        text not null,
  created_at  timestamptz not null default now()
);

-- Raw log of every inbound message (audit / replay).
create table if not exists captures (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default 'telegram',
  kind        text not null default 'text', -- text | voice
  raw         text,                          -- text or voice transcript
  meta        jsonb,
  created_at  timestamptz not null default now()
);

-- Tasks.
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  status      text not null default 'open', -- open | done
  priority    text,                          -- low | med | high
  due_date    date,
  notes       text,
  source      text default 'telegram',
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);

-- Notes.
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  content     text not null,
  tags        text[],
  created_at  timestamptz not null default now()
);

-- Key/value settings (e.g. which Gemini model is active — the switchable brain).
create table if not exists settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

-- Expenses.
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric not null,
  currency    text not null default 'INR',
  item        text,
  category    text,                          -- food | travel | work | ...
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Habit logs (running, reading, yoga, journalling, ...).
create table if not exists habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit       text not null,
  done_on     date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

-- Clients / pipeline (the GTM command center).
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  domain       text,
  stage        text default 'Discovery',
  next_action  text,
  blocker      text,
  contact      text,
  priority     text,
  last_contact date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- People (contacts directory).
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text, role text, company text, relationship text,
  last_contact date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Goals (direction + progress).
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null, why text, status text default 'active', target_date date, progress int default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Journal (daily reflections).
create table if not exists journal (
  id uuid primary key default gen_random_uuid(),
  entry text not null, entry_date date not null default current_date, mood text,
  created_at timestamptz not null default now()
);

-- Security: enable RLS with NO policies. The anon/publishable key is then
-- blocked from every table; our server uses the service_role key, which
-- bypasses RLS. So nothing is publicly readable.
alter table profile      enable row level security;
alter table memory_facts enable row level security;
alter table captures     enable row level security;
alter table tasks        enable row level security;
alter table notes        enable row level security;
alter table settings     enable row level security;
alter table expenses     enable row level security;
alter table habit_logs   enable row level security;
alter table clients      enable row level security;
alter table people       enable row level security;
alter table goals        enable row level security;
alter table journal      enable row level security;
