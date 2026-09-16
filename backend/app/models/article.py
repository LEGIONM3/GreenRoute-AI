import json
from sqlalchemy import Column, String, Text, Boolean, Integer
from app.core.database import Base
from app.models.base import TimestampMixin


class KnowledgeArticle(Base, TimestampMixin):
    __tablename__ = "knowledge_articles"

    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False, index=True)  # "Segregation", "Composting", "E-Waste Safety", "Circular Economy"
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    tags_raw = Column(Text, default="[]", nullable=False)
    read_time = Column(String(20), default="4 min read", nullable=False)
    infographic_url = Column(String(500), nullable=True)
    is_published = Column(Boolean, default=True, nullable=False)
    views_count = Column(Integer, default=0, nullable=False)

    @property
    def tags(self):
        try:
            return json.loads(self.tags_raw)
        except Exception:
            return []

    @tags.setter
    def tags(self, value):
        self.tags_raw = json.dumps(value or [])
