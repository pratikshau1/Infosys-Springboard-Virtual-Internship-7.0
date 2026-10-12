# AI Project Intelligence & Risk Advisor

An intelligent project-management platform that transforms scattered project documents into a living, queryable project intelligence layer.

## Architecture
- **Backend:** Django, Django REST Framework, ChromaDB, Gemini AI orchestration
- **Frontend:** React 19, Vite, TailwindCSS
- **Vector Database:** ChromaDB

## Features
- Multi-format artifact ingestion (PDF, DOCX, CSV, TXT)
- Multi-agent AI analysis (Scope, Risk, Blocker, Action Items, Delivery Forecast)
- Deterministic Project Health Score Calculation
- Interactive RAG AI Assistant with grounded citations
- On-demand Markdown Report generation

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv ../venv
../venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python seed_demo.py
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your browser.
