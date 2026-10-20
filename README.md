# AI Project Intelligence & Risk Advisor

An end-to-end AI platform for document intelligence, automated project risk assessment, milestone/task tracking, and project-isolated semantic search.

## Overview
The AI Project Intelligence & Risk Advisor allows project teams to ingest project documentation (PDF, DOCX, CSV, TXT), automatically extract and chunk knowledge, detect technical/schedule/operational risks, track deliverables, and consult an interactive AI Risk Advisor.

## Key Features
- **Authentication & Multi-Tenant Isolation**: Secure JWT authentication with project-isolated knowledge stores.
- **Document Intelligence Pipeline**: Multi-format parsing (PDF via PyMuPDF, DOCX via python-docx, CSV via pandas, and plain text) with text cleaning, token-aware chunking, and vector embeddings.
- **AI Risk Advisor**: Automated risk extraction, risk severity classification (High / Medium / Low), and overall risk level assessment.
- **Task & Milestone Intelligence**: Automatic detection and ingestion of tabular milestone deliverables and tasks from CSVs with progress metrics.
- **Conversational Project Advisor**: Intelligent RAG consultation with source citations, powered by OpenAI (or offline heuristic fallback).
- **Project-Isolated Semantic Search**: In-memory cosine similarity and pgvector compatibility.
- **Interactive Web Interface**: Multi-tab project workspace with dark-mode styling, file management, risk registers, and knowledge querying.

## Architecture
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Alembic, Pydantic v2
- **Database**: PostgreSQL with `pgvector` (or SQLite for local development)
- **Embeddings**: Configurable (OpenAI `text-embedding-3-small` or local semantic hash fallback)

---

## Quickstart

### Option 1: Docker Compose (Full Stack)
The easiest way to run the database, backend, and frontend together:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs (Swagger): `http://localhost:8000/docs`

---

### Option 2: Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python create_db.py
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Automated Test Suite
Run the backend test suite using `pytest`:
```bash
cd backend
venv\Scripts\activate  # On Windows
pytest -v
```

All 5 core test suites cover:
- User registration, login, and JWT credential validation
- Project creation, updating, listing, and deletion
- Document upload, text extraction, cleaning, and chunking
- Semantic knowledge search
- Automated risk advisor extraction and task tracking

---

## API Reference
- **Auth**:
  - `POST /api/auth/register` - Create user account
  - `POST /api/auth/login` - Authenticate and obtain JWT
  - `GET /api/auth/me` - Current user profile
- **Projects**:
  - `GET /api/projects` - List user projects
  - `POST /api/projects` - Create a new project
  - `GET /api/projects/{id}` - Get project details
  - `PATCH /api/projects/{id}` - Update project
  - `DELETE /api/projects/{id}` - Delete project
- **Document Management**:
  - `POST /api/projects/{id}/documents` - Upload document (PDF, DOCX, CSV, TXT)
  - `GET /api/projects/{id}/documents` - List project documents
  - `GET /api/projects/{id}/documents/{doc_id}/download` - Download document
  - `DELETE /api/projects/{id}/documents/{doc_id}` - Delete document
  - `POST /api/projects/{id}/documents/{doc_id}/retry` - Retry failed pipeline
- **Knowledge & Search**:
  - `POST /api/projects/{id}/knowledge/search` - Semantic search across chunks
  - `GET /api/projects/{id}/knowledge/stats` - Indexed documents and chunk counts
- **Project Intelligence & Risk Advisor**:
  - `GET /api/projects/{id}/risks` - Extract and classify risks
  - `GET /api/projects/{id}/tasks` - Ingest and calculate milestone deliverables
  - `POST /api/projects/{id}/advisor/ask` - Consult AI Risk Advisor
