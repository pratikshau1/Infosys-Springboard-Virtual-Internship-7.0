import re

def clean_text(text: str) -> str:
    if not text:
        return ""
    
    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove excessive whitespace but preserve paragraph breaks
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Remove control characters except newline and tab
    text = "".join(ch for ch in text if ch == '\n' or ch == '\t' or ord(ch) >= 32)
    
    return text.strip()
