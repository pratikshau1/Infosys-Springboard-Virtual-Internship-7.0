from app.core.config import settings
import tiktoken

def chunk_text(text: str, file_type: str, extracted_data: dict) -> list:
    # A simple sliding window chunker
    chunk_size = settings.CHUNK_SIZE
    chunk_overlap = settings.CHUNK_OVERLAP
    
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    
    chunks = []
    
    if len(tokens) == 0:
        return chunks
        
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        
        # Determine page number (heuristic for PDF)
        page_num = None
        if file_type.upper() == "PDF" and "pages" in extracted_data:
            # simple mapping based on string search
            for p in extracted_data["pages"]:
                if chunk_text[:50] in p["text"] or chunk_text[-50:] in p["text"]:
                    page_num = p["page_number"]
                    break
                    
        chunks.append({
            "text": chunk_text,
            "token_count": len(chunk_tokens),
            "page_number": page_num,
            "section": None
        })
        
        start += (chunk_size - chunk_overlap)
        
    return chunks
