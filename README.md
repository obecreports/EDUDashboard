# ConED — Next.js (App Router)

ThaiMOOC-styled school network dashboard with MapLibre, Supabase, and 4-level RBAC.

## Stack

- **Next.js 15** App Router · TypeScript · Tailwind · Lucide
- **Supabase** (`School_Basic`, `School_People`, `School_Score`, `Gov_Domain`, `Label_Lookup`)
- **RBAC tables** (see `supabase/migrations/001_rbac_visits_settings.sql`)
- **MapLibre GL** client map at `/thailand-map`
- **Host:** [Vercel](https://vercel.com) (standard Next.js)

## Quick start

```bash
cp .env.local.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the repo.
3. Framework preset: **Next.js** (auto-detected). Leave Build Command as `next build`.
4. Add Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.

Do **not** set `CONED_RELAX_TLS` on Vercel.

### Supabase SQL

1. Open Supabase → SQL Editor  
2. Paste and run `supabase/migrations/001_rbac_visits_settings.sql`  
3. Creates `user_profiles`, `school_visit_logs`, `site_settings` + RLS + auth trigger  

### Demo RBAC

Until you wire Supabase Auth, use the **top-right role switcher** (cookie `coned-demo-role`).  
Middleware still protects `/staff/*`, `/overseer/*`, `/admin/*`, `/manage-schools`.

## Routes

| Path | Access |
|------|--------|
| `/` | Global dashboard (live Supabase aggregates) |
| `/thailand-map` | MapLibre + school points |
| `/schools`, `/schools/[id]` | School list / detail |
| `/staff/dashboard` | Staff hub |
| `/staff/calendar`, `/staff/profile`, `/staff/update-school` | Staff tools |
| `/overseer/progress` | Staff activity tracking |
| `/admin/settings` | Site settings + accounts |
| `/manage-schools` | Zone / school scope |

## Fresh GitHub repository (no old Vite / branch mess)

Run these from the project root after reviewing `.gitignore` (secrets stay out).

```bash
# 1) Remove old git history (optional — only if starting a brand-new remote)
#    WARNING: deletes local git metadata. Backup first if unsure.
rm -rf .git

# 2) Initialize a clean repo
git init
git branch -M main

# 3) Stage Next.js project (env files are ignored)
git add .
git status   # confirm .env.local is NOT listed

# 4) First commit
git commit -m "$(cat <<'EOF'
Initial commit: ConED Next.js 14 App Router with Supabase and MapLibre.

EOF
)"

# 5) Create empty GitHub repo (example), then push
#    Replace OWNER/coned-next with your repo
gh repo create OWNER/coned-next --private --source=. --remote=origin --push

# Or manually:
# git remote add origin https://github.com/OWNER/coned-next.git
# git push -u origin main
```

Do **not** force-push to an existing shared `main` unless the team agrees.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
