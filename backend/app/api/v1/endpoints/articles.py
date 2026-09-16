from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin_user
from app.models.article import KnowledgeArticle
from app.schemas.article import ArticleOut, ArticleCreate
from app.services.rag_service import rag_service

router = APIRouter()


@router.get("", response_model=List[ArticleOut])
def list_articles(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(KnowledgeArticle).filter(KnowledgeArticle.is_published == True)

    if category:
        query = query.filter(KnowledgeArticle.category.ilike(category))

    if search:
        p = f"%{search.lower()}%"
        query = query.filter(
            (KnowledgeArticle.title.ilike(p)) |
            (KnowledgeArticle.summary.ilike(p)) |
            (KnowledgeArticle.tags_raw.ilike(p))
        )

    return query.order_by(KnowledgeArticle.created_at.desc()).all()


@router.get("/{slug}", response_model=ArticleOut)
def get_article_by_slug(slug: str, db: Session = Depends(get_db)) -> Any:
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.slug == slug,
        KnowledgeArticle.is_published == True
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Increment views count
    article.views_count += 1
    db.commit()
    db.refresh(article)
    return article


@router.post("", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleCreate,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    existing = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Article with this slug already exists")

    article = KnowledgeArticle(
        title=payload.title,
        slug=payload.slug,
        category=payload.category,
        summary=payload.summary,
        content=payload.content,
        read_time=payload.read_time,
        infographic_url=payload.infographic_url,
        is_published=payload.is_published
    )
    article.tags = payload.tags

    db.add(article)
    db.commit()
    db.refresh(article)

    # Ingest into RAG store
    rag_service.ingest_article(db, article)

    return article
