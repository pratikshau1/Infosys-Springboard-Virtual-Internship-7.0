from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class DocumentBase(BaseModel):
    name: str
    original_filename: str
    file_type: str
    file_size: int

class DocumentResponse(DocumentBase):
    id: str
    project_id: str
    processing_status: str
    processing_error: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    text: str
    page_number: Optional[int] = None
    section: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SearchResult(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    text: str
    page_number: Optional[int] = None
    section: Optional[str] = None
    similarity: float

class SearchResponse(BaseModel):
    results: List[SearchResult]

class KnowledgeStats(BaseModel):
    documents_indexed: int
    knowledge_chunks: int
