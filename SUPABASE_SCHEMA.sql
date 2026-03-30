-- Run this in your Supabase project: SQL Editor → New query → paste → Run

create table if not exists leads (
  id text primary key,
  company text not null,
  contact text,
  title text,
  contact_email text,
  industry text,
  volume text,
  location text,
  signal text,
  score int,
  score_reason text,
  email_subject text,
  email_body text,
  status text default 'new',
  notes text,
  updated_by text,
  added_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable real-time sync
alter publication supabase_realtime add table leads;

-- Allow public read/write (fine for internal team tool)
create policy "Allow all" on leads for all using (true) with check (true);
alter table leads enable row level security;
