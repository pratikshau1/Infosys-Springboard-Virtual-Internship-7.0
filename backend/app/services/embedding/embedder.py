import hashlib
import numpy as np
from openai import OpenAI
from app.core.config import settings

def _pseudo_hash_embedding(text: str, dim: int = 1536) -> list[float]:
    words = text.lower().split()
    vec = np.zeros(dim, dtype=np.float32)
    if not words:
        vec[0] = 1.0
        return vec.tolist()
    
    for word in words:
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 4) & 1) else -1.0
        vec[idx] += sign

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return vec.tolist()

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
        
    if not settings.EMBEDDING_API_KEY:
        # Deterministic semantic hash embeddings for development if no key provided
        return [_pseudo_hash_embedding(t) for t in texts]
        
    client = OpenAI(api_key=settings.EMBEDDING_API_KEY)
    
    # Process in batches of 100 to avoid limits
    batch_size = 100
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = client.embeddings.create(
            input=batch,
            model=settings.EMBEDDING_MODEL
        )
        embeddings = [data.embedding for data in response.data]
        all_embeddings.extend(embeddings)
        
    return all_embeddings
