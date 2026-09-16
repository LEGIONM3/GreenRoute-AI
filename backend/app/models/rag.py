import json
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantMixin


class Document(Base, TimestampMixin, TenantMixin):
    __tablename__ = "documents"

    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # "policy", "guideline", "faq", "article", "pdf", "docx"
    source_id = Column(String(36), nullable=True)  # reference to policy or article id
    file_path = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    chunk_count = Column(Integer, default=0, nullable=False)

    # Document Governance & Versioning
    version = Column(String(20), default="1.0", nullable=False)
    approval_status = Column(String(50), default="approved", nullable=False)  # draft, approved, archived
    effective_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    approved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding_raw = Column(Text, nullable=True)  # JSON array of floats for embedding vector
    metadata_raw = Column(Text, default="{}", nullable=False)  # JSON metadata: title, section, source_url

    document = relationship("Document", back_populates="chunks")

    @property
    def embedding(self):
        try:
            return json.loads(self.embedding_raw) if self.embedding_raw else None
        except Exception:
            return None

    @embedding.setter
    def embedding(self, value):
        self.embedding_raw = json.dumps(value) if value is not None else None

    @property
    def chunk_metadata(self):
        try:
            return json.loads(self.metadata_raw)
        except Exception:
            return {}

    @chunk_metadata.setter
    def chunk_metadata(self, value):
        self.metadata_raw = json.dumps(value or {})


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(150), default="New Waste Guidance Query", nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    citations_raw = Column(Text, default="[]", nullable=False)  # JSON array of Citation objects

    session = relationship("ChatSession", back_populates="messages")

    @property
    def citations(self):
        try:
            return json.loads(self.citations_raw)
        except Exception:
            return []

    @citations.setter
    def citations(self, value):
        self.citations_raw = json.dumps(value or [])
