# Nova Outreach Pipeline — Deploy Guide

## What you need (all free)
- GitHub account — github.com
- Vercel account — vercel.com (sign up with GitHub)
- Supabase account — supabase.com (sign up with GitHub)

---

## Step 1 — Set up Supabase (5 min)

1. Go to supabase.com → New project (any name, any region)
2. Once created, go to **SQL Editor** → **New query**
3. Paste the contents of `SUPABASE_SCHEMA.sql` → click **Run**
4. Go to **Project Settings** → **API**
5. Copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2 — Put code on GitHub (3 min)

1. Go to github.com → click **+** → **New repository** → name it `nova-pipeline` → Create
2. On your computer, open Terminal (Mac) or Command Prompt (Windows)
3. Run these commands one by one:

```
cd nova-pipeline
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nova-pipeline.git
git push -u origin main
```

---

## Step 3 — Deploy on Vercel (2 min)

1. Go to vercel.com → **Add New Project** → Import your `nova-pipeline` GitHub repo
2. Before clicking Deploy, click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |

3. Click **Deploy** — done in ~2 minutes

---

## Step 4 — Share with team

Send teammates your Vercel URL (e.g. `nova-pipeline.vercel.app`).
Everyone uses the same URL. Changes sync live across all users.

---

## Local development (optional)

```
cp .env.example .env.local
# fill in your keys in .env.local

npm install
npm run dev
# open http://localhost:3000
```
