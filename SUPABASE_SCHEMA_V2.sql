-- ============================================
-- Nova Growth OS · Supabase Schema V2
-- Run this in Supabase: SQL Editor → New query → Run
-- ============================================

-- E01: Ops contacts (COO / VP Ops targets)
create table if not exists ops_contacts (
  id text primary key,
  company text not null,
  industry text,
  contact text,
  title text,
  email_guess text,
  email_confidence text,
  linkedin text,
  signal text,
  score int,
  email_subject text,
  email_body text,
  status text default 'new',
  notes text,
  updated_by text,
  added_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table ops_contacts;
create policy "Allow all ops_contacts" on ops_contacts for all using (true) with check (true);
alter table ops_contacts enable row level security;

-- E02: Referral tracker
create table if not exists referrals (
  id text primary key,
  customer_company text not null,
  customer_contact text,
  ask_date date,
  ask_status text default 'pending',
  intro_to_company text,
  intro_to_contact text,
  intro_status text default 'pending',
  notes text,
  updated_by text,
  added_at timestamptz default now()
);

alter publication supabase_realtime add table referrals;
create policy "Allow all referrals" on referrals for all using (true) with check (true);
alter table referrals enable row level security;

-- E03: Content / inbound tracker
create table if not exists content_pieces (
  id text primary key,
  title text not null,
  type text default 'linkedin_post',
  publish_date date,
  url text,
  topic text,
  views int default 0,
  engagements int default 0,
  demo_requests int default 0,
  notes text,
  updated_by text,
  added_at timestamptz default now()
);

alter publication supabase_realtime add table content_pieces;
create policy "Allow all content_pieces" on content_pieces for all using (true) with check (true);
alter table content_pieces enable row level security;
