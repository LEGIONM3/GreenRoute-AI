from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ArticleBase(BaseModel):
    title: str
    slug: str
    category: str
    summary: str
    content: str
    tags: List[str] = []
    read_time: str = "4 min read"
    infographic_url: Optional[str] = None
    is_published: bool = True


class ArticleCreate(ArticleBase):
    pass


class ArticleOut(ArticleBase):
    id: str
    views_count: int
    created_at: datetime

    class Config:
        from_attributes = True
