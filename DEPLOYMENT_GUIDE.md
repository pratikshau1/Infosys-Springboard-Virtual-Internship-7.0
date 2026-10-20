# AI Project Intelligence & Risk Advisor - Deployment Guide

This guide walks you through deploying the **AI Project Intelligence & Risk Advisor** to production.

---

## Architecture Overview
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (Served via Nginx in Docker or Vercel static hosting)
- **Backend**: FastAPI + SQLAlchemy + Uvicorn (REST API with JWT Authentication)
- **Database**: PostgreSQL with `pgvector` extension (or SQLite for small local servers)
- **AI / Embeddings**: OpenAI Embeddings (`text-embedding-3-small`) or automatic deterministic offline hash fallback

---

## Pre-Deployment Checklist
Before deploying, make sure you configure your environment variables:

1. **Generate a Secure Secret Key**:
   Run this in your terminal to generate a cryptographically strong 32-byte secret key:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **CORS Origins**:
   Set `CORS_ORIGINS` to your deployed frontend domain (e.g. `https://my-app.vercel.app` or `http://my-server-ip:3000`).
3. **Embeddings API Key**:
   Set `EMBEDDING_API_KEY` to your OpenAI key if you want live semantic vectors. (If left blank, the system automatically uses its built-in offline hash embedding fallback).

---

## Deployment Option 1: Docker Compose (VPS / DigitalOcean / AWS Lightsail / Linux VM)

This is the fastest full-stack deployment for a Virtual Private Server (VPS). It spins up:
- PostgreSQL + pgvector database
- FastAPI backend on port 8000
- Nginx frontend on port 3000 (with automatic `/api` reverse proxy)

### Steps:
1. **Clone or transfer the project to your server**:
   ```bash
   git clone <your-repo-url>
   cd "info project"
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set your `SECRET_KEY`, `POSTGRES_PASSWORD`, and optionally `EMBEDDING_API_KEY`.

3. **Build & Start Containers**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Health**:
   - Backend health check: `curl http://localhost:8000/health`
   - Open browser: `http://<your-server-ip>:3000`

---

## Deployment Option 2: Render.com (1-Click Managed Cloud)

The project includes a ready-to-use **`render.yaml` Blueprint**.

### Steps:
1. Push your repository to **GitHub**.
2. Log into [Render.com](https://render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render reads `render.yaml` and will automatically provision:
   - A managed PostgreSQL database (`project-advisor-db`).
   - The FastAPI backend web service (`project-intelligence-backend`) with health checks.
   - The React frontend static site (`project-intelligence-frontend`) with automatic SPA URL rewrites.
6. Click **Apply**. Once built, your site will be live with free SSL (`https://...`).

---

## Deployment Option 3: Vercel (Frontend) + Railway (Backend)

### Backend on Railway:
1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Add a **PostgreSQL** database service.
3. Add a service from GitHub repo pointing to the `/backend` folder.
4. Set environment variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `SECRET_KEY`: `<your_generated_secret_key>`
   - `CORS_ORIGINS`: `https://<your-vercel-app>.vercel.app`
5. Railway will automatically build the backend Dockerfile and start the API.

### Frontend on Vercel:
1. Go to [Vercel.com](https://vercel.com) and import your GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://<your-railway-backend-url>/api`
5. Click **Deploy**.

---

## Operational Verification

After deployment, test the following:
1. **Health Check**: Visit `https://<your-backend-domain>/health` -> should return `{"status": "healthy"}`.
2. **Registration / Login**: Create a new user account to verify database connection and password hashing.
3. **Project Creation**: Create a project and verify it appears on the dashboard.
4. **Document Ingestion**: Upload a sample document (`sample-data/System_Architecture_Proposal.txt` or CSV) to test parsing, chunking, and risk detection.
