# 🚀 Production Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide provides complete step-by-step instructions for deploying the **PeoplePay360** HRMS application to **Render** (Backend API & PostgreSQL Database) and **Vercel** (Frontend Web Application).

---

## 🏗️ Architecture Overview

```
[ Web Browser ] ───( HTTPS /api/* )───> [ Vercel: Next.js Frontend ]
                                                 │ (Next.js Rewrites Reverse Proxy)
                                                 ▼
                                        [ Render: Backend API Server ]
                                                 │
                                                 ▼
                                        [ PostgreSQL Database ]
```

### Why Use the Reverse Proxy Approach?
- **Zero CORS Issues**: The browser communicates only with your frontend domain (`https://your-app.vercel.app/api/*`). Vercel proxies these requests server-to-server to Render.
- **First-Party Cookies**: Session cookies (`hrms_token`) remain first-party to your Vercel domain, avoiding third-party cookie blocking in modern browsers (Safari ITP, Chrome Privacy Sandbox, Firefox).
- **Direct Cross-Origin Fallback**: The backend also includes native CORS headers and preflight (OPTIONS) support if you choose to point directly to Render.

---

## 🗄️ STEP 1: Set Up the PostgreSQL Database

You can use any cloud PostgreSQL provider:
- **Render PostgreSQL** (Integrated on Render)
- **Neon.tech** (Serverless PostgreSQL, high performance, free tier)
- **Supabase** (Managed PostgreSQL)

### Using Render PostgreSQL:
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **PostgreSQL**.
3. Configure the database:
   - **Name**: `peoplepay360-db`
   - **Database**: `odoopeoplepay`
   - **Plan**: `Free`
4. Click **Create Database**.
5. Once provisioned, copy the connection URL:
   - **Internal Database URL** (for services running inside Render)
   - **External Database URL** (for running migrations from your local machine)

---

## ⚙️ STEP 2: Deploy Backend to Render

### Method A: Manual Web Service Setup (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Web Service**.
2. Connect your GitHub repository (`odooXpeoplePay`).
3. Configure the service settings:
   - **Name**: `peoplepay360-backend`
   - **Region**: Singapore / Frankfurt / Oregon (select region closest to your database)
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ *(Critical: Backend code is located in the `backend/` directory)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: `Free`

4. Add the following **Environment Variables**:
   | Variable Key | Suggested Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production environment flag |
   | `DATABASE_URL` | `postgresql://...` | Connection string from Step 1 |
   | `JWT_SECRET` | *(Random 32+ character string)* | Secret key for signing auth tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token validity period |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Vercel domain for CORS (update once Vercel deploys) |
   | `COOKIE_SAMESITE` | `lax` | Cookie SameSite security attribute |

5. Click **Deploy Web Service**.
6. Once deployed, note your service URL (e.g. `https://peoplepay360-backend.onrender.com`).

---

## 📦 STEP 3: Run Database Migrations & Seed Data

Initialize all 17+ tables and load the Northstar Technologies sample dataset into your cloud database.

### From your local terminal:
```bash
cd backend

# Execute setup with your remote DATABASE_URL:
DATABASE_URL="your-remote-postgres-url" npm run db:setup
```

What `npm run db:setup` performs:
1. `npm run db:migrate` -> Executes Drizzle SQL migrations and creates all tables.
2. `npm run db:seed` -> Populates departments, job positions, schedules, 16 employees, contracts, salary rules, allocations, and user accounts.

*(Alternative: You can open the **Shell** tab in the Render Web Service dashboard and execute `npm run db:setup` directly).*

---

## 🌐 STEP 4: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project** and select your GitHub repository (`odooXpeoplePay`).
3. Project Configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (Default root where `package.json` is located)
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `.next` (Default)

4. Add the following **Environment Variables**:
   | Variable Key | Value | Description |
   |---|---|---|
   | `NEXT_PUBLIC_DATA_MODE` | `api` | Disables mock mode and routes data to the live backend |
   | `BACKEND_PROXY_URL` | `https://peoplepay360-backend.onrender.com/api` | Your Render backend URL (+ `/api`) |
   | `NEXT_PUBLIC_API_BASE_URL` | `/api` | Relative API path forwarded by Next.js rewrites |

5. Click **Deploy**! 🚀

---

## 🔑 STEP 5: Live Verification & Demo Credentials

When deployment finishes, open your Vercel URL and test authentication using any of the seeded user accounts:

| Role | Email | Password |
|---|---|---|
| **Admin (COO)** | `arjun.mehta@northstar.io` | `Password123!` |
| **HR Manager** | `priya.shah@northstar.io` | `Password123!` |
| **Payroll Manager** | `neha.jain@northstar.io` | `Password123!` |
| **Employee** | `rahul.sharma@northstar.io` | `Password123!` |
| **System Admin** | `admin@northstar.io` | `Password123!` |

---

## ⚠️ Notes & Troubleshooting

1. **Render Free Tier Spin-Down (Cold Start):**
   - Free Web Services on Render sleep after 15 minutes of inactivity.
   - The first request after a period of dormancy may take 30–50 seconds while the container boots up. Subsequent requests respond immediately.
2. **Rewrites URL Normalization:**
   - Root `next.config.mjs` automatically normalizes `BACKEND_PROXY_URL`. Whether you specify the URL with or without `/api`, it will correctly proxy to the backend API.
3. **CORS & Cookies:**
   - Backend `proxy.js` includes automated preflight `OPTIONS` resolution and reflects allowed origins with `Access-Control-Allow-Credentials: true`.
