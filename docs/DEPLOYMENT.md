# Production Deployment Guide

This guide covers deploying the Wishlist app with:
- **Backend:** Render, Railway, or VPS (Docker)
- **Frontend:** Vercel
- **Database:** Managed PostgreSQL (e.g. Render, Railway, Neon, Supabase, AWS RDS)

---

## 1. Managed PostgreSQL

Create a PostgreSQL database first; you will need its URL for the backend.

| Provider   | Notes |
|-----------|--------|
| **Render** | PostgreSQL add-on or standalone; copy "Internal" or "External" URL. |
| **Railway** | New → Database → PostgreSQL; copy `DATABASE_URL`. |
| **Neon** | Create project → connection string (pooled recommended). |
| **Supabase** | Project Settings → Database → connection string (use "Session mode" for migrations). |

**Connection string format:**
- **App (async):** `postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE`
- **Alembic (sync):** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

If your provider gives only `postgresql://...`, use the same URL for sync; for the app replace `postgresql://` with `postgresql+asyncpg://`.

---

## 2. Backend Environment Variables

Set these wherever the backend runs (Render, Railway, or VPS).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Async URL: `postgresql+asyncpg://USER:PASS@HOST:PORT/DB` |
| `DATABASE_URL_SYNC` | No* | Sync URL for Alembic. If omitted, derived from `DATABASE_URL` (asyncpg → plain postgresql). |
| `JWT_SECRET_KEY` | Yes | Long random string (e.g. `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | No | Default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Default `7` |
| `CORS_ORIGINS` | Yes | JSON array of frontend origins, e.g. `["https://yourapp.vercel.app"]` |
| `DEBUG` | No | Set `false` in production |
| `APP_NAME` | No | Default `Wishlist API` |
| `PUBLIC_LINK_TOKEN_LENGTH` | No | Default `32` |

\* Set `DATABASE_URL_SYNC` only if your provider gives a different sync URL; otherwise the app derives it from `DATABASE_URL`.

**Example (Render/Railway):**
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
JWT_SECRET_KEY=<your-32-char-secret>
CORS_ORIGINS=["https://yourapp.vercel.app"]
DEBUG=false
```
(`DATABASE_URL_SYNC` is optional; it is derived from `DATABASE_URL` if not set.)

---

## 3. Backend: Render

### 3.1 Create Web Service

1. **Dashboard:** New → Web Service.
2. **Connect** your repo (e.g. GitHub).
3. **Root directory:** `backend` (if repo is monorepo) or leave blank if backend is the repo root.
4. **Runtime:** Python 3.
5. **Build command:**
   ```bash
   pip install -r requirements.txt
   ```
6. **Start command:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   Render sets `PORT` automatically.

### 3.2 Environment Variables

In the service → Environment tab, add all backend env vars (see §2). For `CORS_ORIGINS`, use the JSON array format.

### 3.3 Database & Migrations

- If using **Render PostgreSQL**: create the add-on and link it; Render sets `DATABASE_URL`. Sync URL is derived automatically unless you set `DATABASE_URL_SYNC`.
- **Run migrations** once after first deploy (Render Shell or locally with `DATABASE_URL` set):
  ```bash
  cd backend
  alembic upgrade head
  ```

### 3.4 Base URL

After deploy, note the backend URL, e.g. `https://your-api.onrender.com`. Use it for the frontend (see §6).

---

## 4. Backend: Railway

### 4.1 Create Project

1. **New Project** → Deploy from GitHub (select repo).
2. Add **PostgreSQL** (New → Database → PostgreSQL). Railway sets `DATABASE_URL` on the backend service when you add the DB to the same project.
3. Add a **Service** from the same repo; set **Root Directory** to `backend` if monorepo.

### 4.2 Settings

- **Build command:** `pip install -r requirements.txt` (or leave default if you use a Dockerfile).
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Variables:** Add `JWT_SECRET_KEY`, `CORS_ORIGINS`, `DEBUG=false`. Railway injects `DATABASE_URL` when you add PostgreSQL; sync URL is derived unless you set `DATABASE_URL_SYNC`.

### 4.3 Migrations

In Railway dashboard → your backend service → **Settings** → **Deploy** you can run a one-off command, or use CLI:

```bash
railway run alembic upgrade head
```

Ensure `DATABASE_URL` (or `DATABASE_URL_SYNC`) is set so Alembic can run.

### 4.4 Base URL

Use the generated URL, e.g. `https://your-api.up.railway.app`, for the frontend.

---

## 5. Backend: VPS (Docker)

### 5.1 Dockerfile (backend)

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Don't rely on .env in image; use runtime env
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 Run on VPS

1. **Install Docker** on the VPS.
2. **Clone repo** and `cd backend`.
3. **Create `.env`** (or export variables):
   ```bash
   DATABASE_URL=postgresql+asyncpg://...
   JWT_SECRET_KEY=...
   CORS_ORIGINS=["https://yourapp.vercel.app"]
   DEBUG=false
   ```
4. **Build and run:**
   ```bash
   docker build -t wishlist-api .
   docker run -d --name wishlist-api -p 8000:8000 --env-file .env wishlist-api
   ```
5. **Migrations** (one-time or after deploy):
   ```bash
   docker run --rm --env-file .env wishlist-api python -m alembic upgrade head
   ```

### 5.3 Reverse proxy (recommended)

Put **Nginx** (or Caddy) in front; terminate TLS and proxy to `http://127.0.0.1:8000`. Example Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

Use your domain (e.g. `https://api.yourdomain.com`) as the frontend API URL.

---

## 6. Frontend: Vercel

### 6.1 Connect Repo

1. **Vercel** → Add New Project → Import Git repository.
2. **Root Directory:** `frontend` (if monorepo) or root if the repo is frontend-only.
3. **Framework Preset:** Next.js (auto-detected).
4. **Build command:** `npm run build` (default).
5. **Output directory:** default (`.next`).

### 6.2 Environment Variables

In Project → Settings → Environment Variables, set:

| Variable | Value | Environments |
|----------|--------|----------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL, no trailing slash, e.g. `https://your-api.onrender.com` | Production, Preview |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL, e.g. `wss://your-api.onrender.com` | Production, Preview |

If you omit `NEXT_PUBLIC_WS_URL`, the client derives it from `NEXT_PUBLIC_API_URL` (http → ws, https → wss).

### 6.3 Deploy

Deploy; Vercel will build and assign a URL (e.g. `https://yourapp.vercel.app`). Use this exact URL in the backend’s `CORS_ORIGINS`.

---

## 7. Post-Deploy Checklist

1. **Backend**
   - [ ] `DATABASE_URL` points to managed PostgreSQL (async URL); sync URL is derived or set explicitly.
   - [ ] `JWT_SECRET_KEY` is a strong random value.
   - [ ] `CORS_ORIGINS` includes the exact Vercel (and any custom) frontend URL(s).
   - [ ] `alembic upgrade head` has been run once.
   - [ ] Health: `GET https://your-api-url/health` returns `{"status":"ok"}`.

2. **Frontend**
   - [ ] `NEXT_PUBLIC_API_URL` is the backend URL (https).
   - [ ] `NEXT_PUBLIC_WS_URL` is the backend WSS URL (or left unset to derive from API URL).
   - [ ] Login, list load, and WebSocket (e.g. open a list and check “Live”) work.

3. **Security**
   - [ ] No default `JWT_SECRET_KEY` in production.
   - [ ] CORS is restricted to your frontend origin(s).
   - [ ] Database uses SSL if required by provider (append `?sslmode=require` to URLs if needed).

---

## 8. Quick Reference: Env by Role

**Backend (Render / Railway / VPS)**  
`DATABASE_URL` · `JWT_SECRET_KEY` · `CORS_ORIGINS` · `DEBUG=false` (optional: `DATABASE_URL_SYNC`)

**Frontend (Vercel)**  
`NEXT_PUBLIC_API_URL` · `NEXT_PUBLIC_WS_URL` (optional)

**Database**  
Managed PostgreSQL; connection strings from provider (async for app, sync for Alembic).
