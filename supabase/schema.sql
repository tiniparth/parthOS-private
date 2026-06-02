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

-- Security: enable RLS with NO policies. The anon/publishable key is then
-- blocked from every table; our server uses the service_role key, which
-- bypasses RLS. So nothing is publicly readable.
alter table profile      enable row level security;
alter table memory_facts enable row level security;
alter table captures     enable row level security;
alter table tasks        enable row level security;
alter table notes        enable row level security;
