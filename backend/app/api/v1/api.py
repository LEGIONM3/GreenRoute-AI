from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    locations,
    reports,
    policies,
    articles,
    search,
    chat,
    admin,
    knowledge,
    compliance
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(locations.router, prefix="/locations", tags=["Locations"])
api_router.include_router(reports.router, prefix="/reports", tags=["Issue Reports"])
api_router.include_router(policies.router, prefix="/policies", tags=["Government Policies"])
api_router.include_router(articles.router, prefix="/articles", tags=["Awareness Center"])
api_router.include_router(search.router, prefix="/search", tags=["Waste Search"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Assistant (RAG)"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge Ingestion & Management"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance & Privacy (DPDP / GDPR)"])
