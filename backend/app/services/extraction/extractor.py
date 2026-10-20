import fitz  # PyMuPDF
import docx
import pandas as pd

def extract_text(file_path: str, file_type: str) -> dict:
    file_type = file_type.upper()
    if file_type == "PDF":
        return extract_pdf(file_path)
    elif file_type == "DOCX":
        return extract_docx(file_path)
    elif file_type == "CSV":
        return extract_csv(file_path)
    elif file_type == "TXT":
        return extract_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def extract_pdf(file_path: str) -> dict:
    doc = fitz.open(file_path)
    text_content = []
    pages = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text()
        if page_text:
            text_content.append(page_text)
            pages.append({"page_number": page_num + 1, "text": page_text})
    
    return {
        "text": "\n\n".join(text_content),
        "pages": pages,
        "metadata": doc.metadata
    }

def extract_docx(file_path: str) -> dict:
    doc = docx.Document(file_path)
    text_content = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_content.append(para.text)
    
    return {
        "text": "\n\n".join(text_content),
        "sections": [] # Simple extraction for milestone 1
    }

def extract_csv(file_path: str) -> dict:
    df = pd.read_csv(file_path)
    text_content = []
    for index, row in df.iterrows():
        row_text = []
        for col_name, value in row.items():
            if pd.notna(value):
                row_text.append(f"{col_name}: {value}")
        text_content.append(" | ".join(row_text))
        
    return {
        "text": "\n\n".join(text_content),
        "rows": len(df)
    }

def extract_txt(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    return {
        "text": text
    }
