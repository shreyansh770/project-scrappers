# Property Scrapers Platform

A production-ready scraper management platform with GitHub Actions execution, PostgreSQL storage, and a React dashboard.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  GitHub Actions (Cron + Manual Triggers)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Scraper 1│ │ Scraper 2│ │ Scraper 3│ │ Scraper N│           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┼────────────┼────────────┘                  │
│                    ▼                                             │
│              lib/base_scraper.py                                │
│              (retry, logging, output)                            │
└────────────────────┬─────────────────────────────────────────────┘
                     │ Results + Run Metadata
                     ▼
          ┌─────────────────────┐
          │  Supabase / Postgres │
          │  ├─ scrapers         │
          │  ├─ scraper_runs     │
          │  └─ scraper_results  │
          └──────────┬──────────┘
                     │ Supabase REST API
                     ▼
          ┌─────────────────────┐
          │  React Dashboard     │
          │  (Vite + Tailwind)   │
          │  ├─ Overview         │
          │  ├─ Run History      │
          │  └─ Code Editor      │
          └─────────────────────┘
```

## Quick Start

### 1. Database Setup (Supabase)

1. Create a free project at https://supabase.com
2. Go to SQL Editor → Run the contents of `sql/001_schema.sql`
3. Go to Settings → API → Copy your **Project URL** and **anon key**

### 2. Environment Variables

Create `.env` files:

**Root `.env`** (for scrapers / GitHub Actions):
```bash
# === REQUIRED: Supabase ===
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...your-service-role-key

# === REQUIRED: GitHub (for dashboard commit feature) ===
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=your-org/property-scrapers
GITHUB_BRANCH=main
```

**`dashboard/.env`** (for the React dashboard):
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...your-anon-key
VITE_GITHUB_REPO=your-org/property-scrapers
```

### 3. Run Scrapers Locally

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run a specific scraper
python -m scrapers.rightmove_london

# Run all scrapers
python scripts/run_all.py
```

### 4. Run Dashboard Locally

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:5173
```

### 5. Deploy

**Dashboard** → Deploy to Vercel/Netlify (zero config):
```bash
cd dashboard
npm run build   # outputs to dist/
# Push to GitHub and connect to Vercel
```

**Scrapers** → Push to GitHub, Actions run automatically on cron.

## Variables to Change

| Variable | Where | What |
|---|---|---|
| `SUPABASE_URL` | `.env`, `dashboard/.env`, GitHub Secrets | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `.env`, GitHub Secrets | Service role key (full access, backend only) |
| `VITE_SUPABASE_ANON_KEY` | `dashboard/.env` | Anon key (restricted access, frontend) |
| `GITHUB_TOKEN` | `.env`, GitHub Secrets | PAT with `repo` scope |
| `GITHUB_REPO` | `.env`, `dashboard/.env` | `owner/repo-name` |
| `GITHUB_BRANCH` | `.env` | Branch scrapers commit to |
| Scraper cron schedules | `config.yml` | Adjust per scraper |
| Scraper `PARAMS` | Each `scrapers/*.py` | Search criteria per site |

## Adding a New Scraper

1. Create `scrapers/my_new_scraper.py` using the template in `scrapers/_template.py`
2. Register it in `config.yml`
3. Push to GitHub — the Action picks it up automatically
4. Or use the Dashboard editor to create + commit directly

## Project Structure

```
property-scrapers/
├── .github/workflows/
│   ├── run_scrapers.yml       # Scheduled cron runner
│   └── scraper_dispatch.yml   # Manual trigger per scraper
├── scrapers/
│   ├── _template.py           # Copy this for new scrapers
│   ├── rightmove_london.py
│   ├── zoopla_manchester.py
│   └── spareroom_birmingham.py
├── lib/
│   ├── base_scraper.py        # Base class with retry, logging
│   ├── storage.py             # Supabase client wrapper
│   └── config.py              # Config loader
├── dashboard/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── lib/               # Supabase + GitHub clients
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
├── scripts/
│   └── run_all.py             # Local runner for all scrapers
├── sql/
│   └── 001_schema.sql         # Database schema
├── config.yml                 # Scraper registry
├── requirements.txt
└── README.md
```
