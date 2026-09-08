# 🚀 Production Deployment Guide: Unified Next.js on Vercel

This guide provides complete instructions for deploying the **PeoplePay360** Full-Stack HRMS application (Frontend UI + Backend API Route Handlers + PostgreSQL ORM) to **Vercel**.

---

## 🏗️ Architecture Overview

```
[ Web Browser ] ───( HTTPS )───> [ Vercel: Unified Next.js App ]
                                          ├── React 19 Frontend (UI Pages)
                                          └── App Router Route Handlers (/api/*)
                                                      │
                                                      ▼
                                          [ Cloud PostgreSQL Database ]
                                          (Neon.tech / Supabase / Render Postgres)
```

### Key Advantages:
- **Single Deployment**: Frontend and Backend deploy together in 1 click from your GitHub repository.
- **Zero CORS / Same-Origin**: Browser talks directly to `/api/*` on the same domain without needing any proxy, CORS headers, or port routing.
- **First-Party Cookies**: Session cookies (`hrms_token`) remain native first-party cookies with maximum browser security (`httpOnly`, `sameSite=lax`, `secure`).
- **Serverless Autoscaling**: Route handlers scale automatically as Vercel Serverless Functions.

---

## 🗄️ STEP 1: Set Up Cloud PostgreSQL Database

You can use any cloud PostgreSQL provider. For Vercel serverless functions, **Neon.tech** or **Supabase** (with connection pooling) is recommended:

### Option A: Neon.tech (Recommended - Free Tier & Instant Provisioning)
1. Sign up at [Neon.tech](https://neon.tech/).
2. Create a new project (e.g. `peoplepay360-db`).
3. Copy the **Pooled Connection String** (format: `postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require`).

### Option B: Supabase
1. Create a project at [Supabase](https://supabase.com/).
2. Go to **Project Settings** -> **Database** -> **Connection String**.
3. Copy the **Transaction Mode (PgBouncer)** URI on port `6543`.

---

## 🚀 STEP 2: Run Migrations & Seed Data

Run migrations and seed the initial company, roles, and employee data from your local machine to your cloud database:

```bash
# 1. Set your cloud DATABASE_URL in .env.local
DATABASE_URL=postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require

# 2. Run schema setup and data seeding
npm run db:setup
```

---

## ⚡ STEP 3: Deploy to Vercel

1. Push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: unified Next.js fullstack for single Vercel deployment"
   git push origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
3. Import your GitHub repository (`odooXpeoplePay`).
4. Keep the default settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Expand **Environment Variables** and add:
   | Variable | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_DATA_MODE` | `api` | Connects UI to database API routes |
   | `NEXT_PUBLIC_API_BASE_URL` | `/api` | Same-origin native routing |
   | `DATABASE_URL` | `postgresql://...` | Your pooled PostgreSQL connection string |
   | `JWT_SECRET` | `your-secret-key-min-32-characters` | Random 32+ character string |
   | `JWT_EXPIRES_IN` | `7d` | Token lifetime |
   | `COOKIE_SAMESITE` | `lax` | Browser cookie policy |
   | `SMTP_HOST` | `smtp.gmail.com` | *(Optional) For payslip email delivery* |
   | `SMTP_PORT` | `587` | *(Optional)* |
   | `SMTP_USER` | `your-email@gmail.com` | *(Optional)* |
   | `SMTP_PASSWORD` | `your-app-password` | *(Optional)* |
   | `SMTP_FROM` | `"PeoplePay360 <noreply@...>` | *(Optional)* |
6. Click **Deploy**.

Within 1-2 minutes, your full-stack app will be live at `https://your-project.vercel.app`!
