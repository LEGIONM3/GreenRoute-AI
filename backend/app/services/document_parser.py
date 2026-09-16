import os
import re
from typing import List, Dict, Any


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extracts clean text from PDF, DOCX, TXT, and Markdown documents."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        import pypdf
        reader = pypdf.PdfReader(file_path)
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())
        return "\n\n".join(pages_text)
        
    elif ext in [".docx", ".doc"]:
        import docx
        doc = docx.Document(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        # Also extract table text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        return "\n\n".join(paragraphs)
        
    elif ext in [".txt", ".md", ".markdown", ".json", ".csv"]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read()
    else:
        # Fallback text reading
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """Splits raw text into structured overlapping chunks preserving semantic paragraph boundaries."""
    # Normalize whitespace
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    
    chunks: List[Dict[str, Any]] = []
    current_chunk = ""
    chunk_index = 0
    
    for para in paragraphs:
        if not current_chunk:
            current_chunk = para
        elif len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk += "\n\n" + para
        else:
            chunks.append({
                "chunk_index": chunk_index,
                "content": current_chunk.strip(),
                "char_count": len(current_chunk.strip())
            })
            chunk_index += 1
            # Overlap handling
            if chunk_overlap > 0 and len(current_chunk) > chunk_overlap:
                current_chunk = current_chunk[-chunk_overlap:] + "\n\n" + para
            else:
                current_chunk = para
                
    if current_chunk.strip():
        chunks.append({
            "chunk_index": chunk_index,
            "content": current_chunk.strip(),
            "char_count": len(current_chunk.strip())
        })
        
    return chunks
