from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    target_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="project", cascade="all, delete-orphan")
