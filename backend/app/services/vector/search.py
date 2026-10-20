from sqlalchemy.orm import Session
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.services.embedding.embedder import generate_embeddings
import numpy as np

def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def search_project_knowledge(project_id: str, query: str, top_k: int, db: Session) -> list[dict]:
    query_embedding = generate_embeddings([query])[0]
    
    # In-memory vector search fallback because pgvector is not available
    chunks = db.query(DocumentChunk, Document.name)\
        .join(Document, DocumentChunk.document_id == Document.id)\
        .filter(DocumentChunk.project_id == project_id)\
        .all()
    
    scored_results = []
    for chunk, doc_name in chunks:
        emb = chunk.embedding
        if emb:
            sim = cosine_similarity(query_embedding, emb)
            scored_results.append((sim, chunk, doc_name))
            
    scored_results.sort(key=lambda x: x[0], reverse=True)
    
    formatted_results = []
    for sim, chunk, doc_name in scored_results[:top_k]:
        formatted_results.append({
            "document_id": chunk.document_id,
            "document_name": doc_name,
            "chunk_id": chunk.id,
            "text": chunk.text,
            "page_number": chunk.page_number,
            "section": chunk.section,
            "similarity": float(sim)
        })
        
    return formatted_results
