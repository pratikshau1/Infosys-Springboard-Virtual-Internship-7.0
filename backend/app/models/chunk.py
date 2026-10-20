from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import json
from app.core.database import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    token_count = Column(Integer, nullable=True)
    
    # Store embedding as JSON string if pgvector is unavailable
    embedding_json = Column(Text, nullable=True) 

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    document = relationship("Document", back_populates="chunks")
    project = relationship("Project", back_populates="chunks")
    
    @property
    def embedding(self):
        if not self.embedding_json:
            return None
        return json.loads(self.embedding_json)
    
    @embedding.setter
    def embedding(self, value):
        self.embedding_json = json.dumps(value) if value else None
