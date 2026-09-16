import os
import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_current_admin_user
from app.models.user import User
from app.models.rag import Document
from app.services.rag_service import rag_service
from app.services.audit_service import log_activity

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".markdown"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("Municipal Circular"),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    """Ingests multi-format documents (PDF, DOCX, TXT, Markdown) into RAG knowledge store."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format {ext}. Allowed types: {list(ALLOWED_EXTENSIONS)}"
        )

    knowledge_dir = os.path.join(settings.UPLOAD_DIR, "knowledge")
    os.makedirs(knowledge_dir, exist_ok=True)

    file_uuid = str(uuid.uuid4())
    stored_filename = f"{file_uuid}_{file.filename}"
    file_path = os.path.join(knowledge_dir, stored_filename)

    # Save to disk
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc_title = title.strip() if title and title.strip() else os.path.splitext(file.filename)[0]

    # Ingest through RAG Service
    try:
        doc = rag_service.ingest_uploaded_file(
            db=db,
            title=doc_title,
            file_path=file_path,
            filename=file.filename,
            category=category,
            uploaded_by_id=current_user.id
        )
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse and index document: {str(e)}"
        )

    log_activity(
        db,
        action="KNOWLEDGE_UPLOAD",
        resource="knowledge",
        resource_id=doc.id,
        user_id=current_user.id,
        details={"title": doc.title, "chunks": doc.chunk_count, "filename": file.filename}
    )

    return {
        "id": doc.id,
        "title": doc.title,
        "source_type": doc.source_type,
        "category": doc.category,
        "chunk_count": doc.chunk_count,
        "created_at": doc.created_at,
        "message": f"Successfully indexed {doc.title} into {doc.chunk_count} RAG chunks."
    }


@router.get("/documents")
def list_documents(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(Document)
    if category:
        query = query.filter(Document.category == category)

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    items = []
    for d in docs:
        uploader_name = d.uploaded_by.full_name if d.uploaded_by else "System"
        items.append({
            "id": d.id,
            "title": d.title,
            "source_type": d.source_type,
            "category": d.category or "General Regulation",
            "chunk_count": d.chunk_count,
            "file_path": d.file_path,
            "uploaded_by": uploader_name,
            "created_at": d.created_at
        })

    return {"total": total, "items": items}


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> None:
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    log_activity(db, action="KNOWLEDGE_DELETE", resource="knowledge", resource_id=doc_id, user_id=current_user.id)
