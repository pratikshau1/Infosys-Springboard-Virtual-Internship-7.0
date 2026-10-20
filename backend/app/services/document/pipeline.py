from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.core.database import SessionLocal
from datetime import datetime, timezone

def process_document(document_id: str, db_session = None):
    should_close = False
    if db_session is not None:
        db = db_session
    else:
        db = SessionLocal()
        should_close = True

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        if should_close:
            db.close()
        return

    try:
        doc.processing_status = "PROCESSING"
        db.commit()

        # 1. Extraction
        from app.services.extraction.extractor import extract_text
        extracted_data = extract_text(doc.storage_path, doc.file_type)

        if not extracted_data or not extracted_data.get("text"):
            raise Exception("No text could be extracted from the document.")

        # 2. Cleaning
        from app.services.extraction.cleaner import clean_text
        cleaned_text = clean_text(extracted_data["text"])

        # 3. Chunking
        from app.services.chunking.chunker import chunk_text
        chunks = chunk_text(cleaned_text, doc.file_type, extracted_data)

        # 4. Embeddings
        from app.services.embedding.embedder import generate_embeddings
        texts_to_embed = [c["text"] for c in chunks]
        embeddings = generate_embeddings(texts_to_embed)

        # 5. Store Chunks + Embeddings
        # First, clear any existing chunks if this was a retry
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        
        for i, chunk_data in enumerate(chunks):
            db_chunk = DocumentChunk(
                document_id=doc.id,
                project_id=doc.project_id,
                chunk_index=i,
                text=chunk_data["text"],
                page_number=chunk_data.get("page_number"),
                section=chunk_data.get("section"),
                token_count=chunk_data.get("token_count", 0),
                embedding=embeddings[i]
            )
            db.add(db_chunk)

        doc.processing_status = "PROCESSED"
        doc.processed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        db.rollback()
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.processing_status = "FAILED"
                doc.processing_error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        if should_close:
            db.close()
