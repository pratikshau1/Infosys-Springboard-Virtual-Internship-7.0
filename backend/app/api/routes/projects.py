from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.project import Project
from app.models.document import Document
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.document import DocumentResponse, SearchResponse, SearchResult, KnowledgeStats
from app.api.deps import get_current_user
from pydantic import BaseModel
import os
import shutil

router = APIRouter()

@router.post("", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=current_user.id,
        start_date=project_in.start_date,
        target_date=project_in.target_date
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Project).filter(Project.owner_id == current_user.id).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project_update: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}

# --- Documents ---

@router.post("/{project_id}/documents", response_model=DocumentResponse)
def upload_document(
    project_id: str, 
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".csv", ".txt"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    project_storage_dir = os.path.join(settings.STORAGE_DIR, project_id)
    os.makedirs(project_storage_dir, exist_ok=True)
    storage_path = os.path.join(project_storage_dir, file.filename)
    
    file_size = 0
    with open(storage_path, "wb") as buffer:
        while chunk := file.file.read(1024 * 1024):
            buffer.write(chunk)
            file_size += len(chunk)
    
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        if os.path.exists(storage_path):
            os.remove(storage_path)
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB")

    doc = Document(
        project_id=project_id,
        name=file.filename,
        original_filename=file.filename,
        file_type=ext[1:].upper(),
        file_size=file_size,
        storage_path=storage_path,
        uploaded_by=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    from app.services.document.pipeline import process_document
    background_tasks.add_task(process_document, doc.id)

    return doc

@router.get("/{project_id}/documents", response_model=List[DocumentResponse])
def get_documents(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Document).filter(Document.project_id == project_id).all()

@router.get("/{project_id}/documents/{document_id}", response_model=DocumentResponse)
def get_document(project_id: str, document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{project_id}/documents/{document_id}/download")
def download_document(project_id: str, document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc or not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")
    return FileResponse(doc.storage_path, filename=doc.original_filename)

@router.delete("/{project_id}/documents/{document_id}")
def delete_document(project_id: str, document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except:
            pass
            
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}

@router.post("/{project_id}/documents/{document_id}/retry")
def retry_document(project_id: str, document_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.processing_status = "PROCESSING"
    doc.processing_error = None
    db.commit()
    
    from app.services.document.pipeline import process_document
    background_tasks.add_task(process_document, doc.id)
    
    return {"message": "Retrying document"}

# --- Knowledge & Search ---
class SearchQuery(BaseModel):
    query: str
    top_k: int = 5

@router.post("/{project_id}/knowledge/search", response_model=SearchResponse)
def search_knowledge(project_id: str, query: SearchQuery, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    from app.services.vector.search import search_project_knowledge
    results = search_project_knowledge(project_id, query.query, query.top_k, db)
    return {"results": results}

@router.get("/{project_id}/knowledge/stats", response_model=KnowledgeStats)
def get_knowledge_stats(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    from app.models.chunk import DocumentChunk
    
    doc_count = db.query(Document).filter(Document.project_id == project_id, Document.processing_status == "PROCESSED").count()
    chunk_count = db.query(DocumentChunk).filter(DocumentChunk.project_id == project_id).count()
    
    return KnowledgeStats(documents_indexed=doc_count, knowledge_chunks=chunk_count)

# --- Project Intelligence & Risk Advisor ---

@router.get("/{project_id}/risks")
def get_project_risks(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    from app.services.project.advisor import extract_project_risks
    return extract_project_risks(project_id, db)

@router.get("/{project_id}/tasks")
def get_project_tasks(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    from app.services.project.advisor import extract_project_tasks
    return extract_project_tasks(project_id, db)

class AdvisorQuery(BaseModel):
    query: str

@router.post("/{project_id}/advisor/ask")
def consult_advisor(project_id: str, query: AdvisorQuery, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    from app.services.project.advisor import ask_advisor
    return ask_advisor(project_id, query.query, db)
