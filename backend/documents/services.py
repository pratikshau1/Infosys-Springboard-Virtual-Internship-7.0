import os
import uuid
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
import chromadb
from chromadb.config import Settings
from django.conf import settings
from .models import Document, DocumentChunk
from intelligence.models import ScopeItem, Deliverable, Risk, Blocker, ActionItem

CHROMA_DB_PATH = os.path.join(settings.BASE_DIR, 'chroma_db')
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

def process_document(document_id):
    doc = Document.objects.get(id=document_id)
    doc.status = 'Processing'
    doc.save()

    try:
        text_content = extract_text(doc)
        chunks = chunk_text(text_content)
        
        # Initialize or get collection
        collection_name = f"project_{doc.project.id}"
        collection = chroma_client.get_or_create_collection(name=collection_name)
        
        chunk_objects = []
        for i, chunk in enumerate(chunks):
            # Create DocumentChunk DB record
            chunk_obj = DocumentChunk(
                document=doc,
                project=doc.project,
                content=chunk,
                chunk_index=i,
                vector_reference=f"chunk_{doc.id}_{i}"
            )
            chunk_objects.append(chunk_obj)
            
            # Add to ChromaDB (ChromaDB automatically handles default embeddings)
            collection.add(
                documents=[chunk],
                metadatas=[{"document_id": doc.id, "document_name": doc.name, "chunk_index": i}],
                ids=[f"chunk_{doc.id}_{i}"]
            )
            
        DocumentChunk.objects.bulk_create(chunk_objects)
        
        doc.status = 'Processed'
        doc.num_pages_rows = len(chunks) # roughly using chunks as size proxy
        doc.save()
        
        # Trigger Agents
        from agents.services import run_orchestrator
        run_orchestrator(doc.project.id)
        
        return True
    except Exception as e:
        doc.status = 'Failed'
        doc.processing_error = str(e)
        doc.save()
        return False

def extract_text(doc):
    if not doc.file_path:
        chunks = doc.chunks.all()
        return "\n\n".join([c.content for c in chunks]) if chunks.exists() else ""

    try:
        file_path = doc.file_path.path
    except Exception:
        chunks = doc.chunks.all()
        return "\n\n".join([c.content for c in chunks]) if chunks.exists() else ""

    if not os.path.exists(file_path):
        chunks = doc.chunks.all()
        return "\n\n".join([c.content for c in chunks]) if chunks.exists() else ""

    file_type = (doc.file_type or '').lower()
    text = ""
    
    try:
        if file_type == 'pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif file_type == 'docx':
            docx = DocxDocument(file_path)
            for para in docx.paragraphs:
                text += para.text + "\n"
        elif file_type == 'csv':
            df = pd.read_csv(file_path)
            text = df.to_string()
        elif file_type in ['txt', 'md', 'json']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
    except Exception as e:
        print(f"Error parsing file {file_path}:", e)
        # Fallback to reading file with errors ignored
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except Exception:
            text = f"Extracted artifact content for {doc.name}"
        
    return text


def chunk_text(text, chunk_size=1000, overlap=200):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks
