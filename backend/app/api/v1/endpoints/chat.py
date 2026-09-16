from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, get_current_user
from app.models.rag import ChatSession, ChatMessage
from app.models.user import User
from app.schemas.chat import (
    ChatQueryRequest,
    ChatQueryResponse,
    ChatSessionOut,
    ChatMessageOut
)
from fastapi.responses import StreamingResponse
from app.services.rag_service import rag_service
from app.services.groq_service import groq_service

router = APIRouter()


@router.post("/query", response_model=ChatQueryResponse)
def query_ai_assistant(
    payload: ChatQueryRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
) -> Any:
    user_id = current_user.id if current_user else None
    response = rag_service.query(
        db=db,
        query_text=payload.query,
        session_id=payload.session_id,
        user_id=user_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        response_mode=payload.response_mode or "auto"
    )
    return response


@router.post("/stream")
def stream_ai_assistant(
    payload: ChatQueryRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Streams Groq completions token by token using Server-Sent Events (SSE)."""
    user_id = current_user.id if current_user else None
    
    def event_stream():
        # Yield streaming token chunks with response mode
        messages = [{"role": "user", "content": payload.query}]
        for token in groq_service.stream_completion(messages, response_mode=payload.response_mode or "auto"):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/sessions", response_model=List[ChatSessionOut])
def get_user_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionOut)
def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.user_id and session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id and session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
    
    db.delete(session)
    db.commit()
