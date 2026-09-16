import os
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.rag import Document, DocumentChunk, ChatSession, ChatMessage
from app.models.policy import Policy
from app.models.article import KnowledgeArticle
from app.models.waste_item import WasteItem
from app.models.location import Location
from app.services.embedding_service import embedding_service
from app.services.groq_service import groq_service
from app.services.gis_service import gis_service
from app.services.hybrid_search import hybrid_search
from app.services.reranker_service import reranker_service
from app.services.grounding_validator import grounding_validator
from app.services.ai_cost_tracker import ai_cost_tracker
from app.schemas.chat import CitationItem, ChatQueryResponse

# Relevant environmental & waste management domains
ALLOWED_KEYWORDS = {
    "waste", "garbage", "trash", "recycle", "recycling", "recyclable", "disposal", "dispose",
    "dustbin", "bin", "segregation", "segregate", "compost", "composting", "plastic", "e-waste",
    "battery", "batteries", "hazardous", "biomedical", "medicine", "medicines", "electronic",
    "collection", "facility", "landfill", "rule", "policy", "guideline", "cpcb", "moefcc",
    "pollution", "sanitation", "dump", "dumping", "clean", "glass", "paper", "cardboard",
    "organic", "wet", "dry", "solid", "thermocol", "bottle", "cans", "debris", "metal"
}


class RAGService:
    def __init__(self):
        self.embedding_service = embedding_service

    def is_query_in_domain(self, query: str) -> bool:
        """
        Safety guardrail: ensures user query is related to waste management,
        environmental regulations, recycling, or municipal sanitation.
        """
        words = set(re.findall(r"\b[a-z0-9_-]+\b", query.lower()))
        if words.intersection(ALLOWED_KEYWORDS):
            return True
        # Check common question stems about how to handle items
        stems = ["how to throw", "how to discard", "where to put", "can i flush", "is it safe to burn"]
        if any(stem in query.lower() for stem in stems):
            return True
        return False

    def ingest_policy(self, db: Session, policy: Policy) -> Document:
        """
        Chunks and vector-indexes a government policy into the RAG store.
        """
        # Remove existing document for this policy if present
        existing = db.query(Document).filter(
            Document.source_type == "policy",
            Document.source_id == policy.id
        ).first()
        if existing:
            db.delete(existing)
            db.commit()

        doc = Document(
            title=policy.title,
            source_type="policy",
            source_id=policy.id,
            file_path=policy.file_url,
            chunk_count=0
        )
        db.add(doc)
        db.flush()

        combined_text = f"Policy Title: {policy.title}\nAuthority: {policy.authority}\nCategory: {policy.category}\nDocument No: {policy.document_number or 'N/A'}\nSummary: {policy.summary}\n\nFull Provisions:\n{policy.full_text}"
        chunks = self.embedding_service.chunk_text(combined_text, chunk_size=450, overlap=80)
        
        for idx, chunk_text in enumerate(chunks):
            embedding = self.embedding_service.get_embedding(chunk_text)
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=chunk_text,
                embedding=embedding,
                chunk_metadata={
                    "title": policy.title,
                    "authority": policy.authority,
                    "category": policy.category,
                    "document_number": policy.document_number or "",
                    "source_type": "Government Policy"
                }
            )
            db.add(chunk)

        doc.chunk_count = len(chunks)
        db.commit()
        return doc

    def ingest_article(self, db: Session, article: KnowledgeArticle) -> Document:
        """
        Chunks and vector-indexes an educational knowledge article.
        """
        existing = db.query(Document).filter(
            Document.source_type == "article",
            Document.source_id == article.id
        ).first()
        if existing:
            db.delete(existing)
            db.commit()

        doc = Document(
            title=article.title,
            source_type="article",
            source_id=article.id,
            chunk_count=0
        )
        db.add(doc)
        db.flush()

        combined_text = f"Article Title: {article.title}\nCategory: {article.category}\nSummary: {article.summary}\n\nContent:\n{article.content}"
        chunks = self.embedding_service.chunk_text(combined_text, chunk_size=450, overlap=80)

        for idx, chunk_text in enumerate(chunks):
            embedding = self.embedding_service.get_embedding(chunk_text)
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=chunk_text,
                embedding=embedding,
                chunk_metadata={
                    "title": article.title,
                    "category": article.category,
                    "read_time": article.read_time,
                    "source_type": "Awareness Guide"
                }
            )
            db.add(chunk)

        doc.chunk_count = len(chunks)
        db.commit()
        return doc

    def ingest_uploaded_file(
        self,
        db: Session,
        title: str,
        file_path: str,
        filename: str,
        category: str = "Uploaded Document",
        uploaded_by_id: Optional[str] = None
    ) -> Document:
        """Parses, chunks, and vector-indexes multi-format files (PDF, DOCX, TXT, MD) into RAG knowledge store."""
        from app.services.document_parser import extract_text_from_file, chunk_text
        raw_text = extract_text_from_file(file_path, filename)
        
        ext = os.path.splitext(filename)[1].replace(".", "").lower() or "document"
        doc = Document(
            title=title,
            source_type=ext,
            source_id=None,
            file_path=file_path,
            category=category,
            uploaded_by_id=uploaded_by_id,
            chunk_count=0
        )
        db.add(doc)
        db.flush()

        chunks = chunk_text(raw_text, chunk_size=500, chunk_overlap=80)
        for c in chunks:
            chunk_text_content = c["content"]
            embedding = self.embedding_service.get_embedding(chunk_text_content)
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=c["chunk_index"],
                chunk_text=chunk_text_content,
                embedding=embedding,
                chunk_metadata={
                    "title": title,
                    "category": category,
                    "filename": filename,
                    "source_type": ext.upper()
                }
            )
            db.add(chunk)
            
        doc.chunk_count = len(chunks)
        db.commit()
        db.refresh(doc)
        return doc

    def hybrid_search(self, db: Session, query: str, top_k: int = 4) -> List[Tuple[DocumentChunk, float]]:
        """
        Hybrid retrieval combining dense cosine similarity and lexical token matching.
        """
        query_embedding = self.embedding_service.get_embedding(query)
        query_words = set(re.findall(r"\b[a-z0-9_-]{2,}\b", query.lower()))

        chunks = db.query(DocumentChunk).all()
        scored_chunks = []

        for chunk in chunks:
            if not chunk.embedding:
                continue
            
            # Semantic cosine similarity
            sem_score = self.embedding_service.cosine_similarity(query_embedding, chunk.embedding)
            
            # Lexical overlap
            chunk_words = set(re.findall(r"\b[a-z0-9_-]{2,}\b", chunk.chunk_text.lower()))
            if query_words and chunk_words:
                overlap = len(query_words.intersection(chunk_words))
                lex_score = overlap / len(query_words)
            else:
                lex_score = 0.0

            # Weighted composite score
            composite_score = (0.65 * sem_score) + (0.35 * lex_score)
            if composite_score >= 0.12:
                scored_chunks.append((chunk, composite_score))

        # Apply BM25 + Vector Reciprocal Rank Fusion
        fused = hybrid_search.fuse_ranks(scored_chunks, query)
        # Apply Cross-Encoder Re-Ranking
        reranked = reranker_service.rerank(query, fused, top_k=top_k)
        return reranked

    def query(
        self,
        db: Session,
        query_text: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        response_mode: str = "auto"
    ) -> ChatQueryResponse:
        """
        Full RAG pipeline execution with Groq AI synthesis, GIS location linking,
        policy citations, and confidence scoring.
        """
        # 1. Manage Chat Session
        session = None
        if session_id:
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            session = ChatSession(
                user_id=user_id,
                title=query_text[:50] + ("..." if len(query_text) > 50 else "")
            )
            db.add(session)
            db.flush()

        # Save user message
        user_msg = ChatMessage(
            session_id=session.id,
            sender="user",
            content=query_text
        )
        db.add(user_msg)
        db.commit()

        # 2. Guardrail validation
        if not self.is_query_in_domain(query_text):
            out_of_scope_answer = (
                "I am the EcoGuide Smart Waste Management & Disposal Assistant. I specialize in answering "
                "questions about waste segregation, recycling guidelines, environmental policies, "
                "hazardous waste handling, and nearby disposal facilities. Please ask a question related "
                "to waste disposal, recycling, or municipal sanitation!"
            )
            asst_msg = ChatMessage(
                session_id=session.id,
                sender="assistant",
                content=out_of_scope_answer,
                citations=[]
            )
            db.add(asst_msg)
            db.commit()
            return ChatQueryResponse(
                answer=out_of_scope_answer,
                citations=[],
                session_id=session.id,
                suggested_followups=[
                    "How do I dispose of old lithium batteries?",
                    "What are the rules for plastic waste segregation?",
                    "Where can I find an authorized e-waste drop-off center?"
                ],
                confidence_score=0.99,
                model_used="guardrail-filter",
                related_locations=[],
                related_policies=[]
            )

        # 3. Direct Item Match Check
        matched_item = None
        for item in db.query(WasteItem).all():
            if item.name.lower() in query_text.lower() or any(alias.lower() in query_text.lower() for alias in item.aliases):
                matched_item = item
                break

        # 4. Hybrid Retrieval
        retrieved = self.hybrid_search(db, query_text, top_k=settings.RAG_TOP_K)
        citations: List[CitationItem] = []
        context_texts = []
        
        for chunk, score in retrieved:
            meta = chunk.chunk_metadata
            source_title = meta.get("title", "Official Guideline")
            source_type = meta.get("source_type", "Regulation")
            doc_num = meta.get("document_number", "")
            
            excerpt = chunk.chunk_text.strip()
            if len(excerpt) > 280:
                excerpt = excerpt[:280] + "..."

            citations.append(CitationItem(
                title=source_title,
                source_type=source_type,
                reference=f"Ref: {doc_num}" if doc_num else f"Section: {meta.get('category', 'Waste Management')}",
                chunk_excerpt=excerpt,
                relevance_score=round(float(score), 3)
            ))
            context_texts.append(f"[{source_title} - {source_type}]:\n{chunk.chunk_text}")

        # 5. Determine Confidence Score
        if retrieved:
            avg_score = sum(s for _, s in retrieved) / len(retrieved)
            confidence_score = round(min(0.98, max(0.68, avg_score * 1.6)), 2)
        elif matched_item:
            confidence_score = 0.94
        else:
            confidence_score = 0.72

        # 6. Resolve Nearby Locations via GIS
        related_locations: List[Dict[str, Any]] = []
        if latitude is not None and longitude is not None:
            nearby = gis_service.get_nearby_locations(db, latitude=latitude, longitude=longitude, radius_km=15.0, limit=3)
            for loc, dist in nearby:
                related_locations.append({
                    "id": loc.id,
                    "name": loc.name,
                    "address": loc.address,
                    "category": loc.category.name if loc.category else "Disposal Center",
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "distance_km": round(dist, 2)
                })
        if not related_locations:
            # Fallback to general verified locations
            verified = db.query(Location).filter(Location.is_verified == True).limit(3).all()
            for loc in verified:
                related_locations.append({
                    "id": loc.id,
                    "name": loc.name,
                    "address": loc.address,
                    "category": loc.category.name if loc.category else "Disposal Center",
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "distance_km": None
                })

        # 7. Extract Related Policies
        db_policies = db.query(Policy).limit(3).all()
        related_policies = [
            {
                "id": p.id,
                "title": p.title,
                "authority": p.authority,
                "category": p.category,
                "document_number": p.document_number or "Statutory Rule"
            }
            for p in db_policies
        ]

        # 8. Synthesize Answer Grounded in Citations with Groq
        model_used = "groq-cascading"
        if settings.LLM_PROVIDER in ("groq", "hybrid"):
            prompt_context = "\n\n".join(context_texts) if context_texts else "Official municipal 3-stream guidelines (Wet/Green, Dry/Blue, Hazardous/Red)."
            item_info = ""
            if matched_item:
                item_info = (
                    f"\nDirect item knowledge: Name: {matched_item.name} | Segregation Bin: {matched_item.segregation_bin} | "
                    f"Disposal Method: {matched_item.disposal_method} | Recycling: {matched_item.recycling_guidance} | "
                    f"Safety Precautions: {matched_item.safety_precautions}"
                )
            
            groq_prompt = (
                f"Official Waste Management Regulatory Context:\n{prompt_context}{item_info}\n\n"
                f"Citizen Inquiry: {query_text}\n\n"
                f"Provide a structured, authoritative answer with:\n"
                f"1. **Segregation Bin**: Specific color/type (Green/Wet, Blue/Dry, Red/Hazardous, or E-Waste)\n"
                f"2. **Disposal Guidance**: Exact instructions for cleaning, packing, or handing over\n"
                f"3. **Environmental & Safety Impact**: Hazards of improper disposal\n"
                f"4. Reference official guidelines or policies where applicable."
            )
            try:
                final_answer, model_used = groq_service.generate_completion(
                    messages=[{"role": "user", "content": groq_prompt}],
                    temperature=0.2,
                    response_mode=response_mode
                )
            except Exception as e:
                # Fallback to local synthesis
                model_used = "local-synthesis"
                final_answer = self._local_synthesis(matched_item, retrieved, context_texts, response_mode=response_mode)
        else:
            final_answer = self._local_synthesis(matched_item, retrieved, context_texts, response_mode=response_mode)
            model_used = "local-synthesis"

        # Sanitize final answer to eliminate raw markdown artifacts
        final_answer = self.sanitize_ai_output(final_answer)

        # 9. Hallucination Grounding Evaluation
        grounding_result = grounding_validator.evaluate_grounding(final_answer, context_texts)
        if grounding_result["is_grounded"]:
            confidence_score = max(confidence_score, float(grounding_result["grounding_score"]))
        else:
            confidence_score = min(confidence_score, max(0.60, float(grounding_result["grounding_score"])))

        # 10. AI Cost & Token Telemetry Accounting
        prompt_tokens_est = len(query_text.split()) * 4 + len(" ".join(context_texts).split()) * 4
        comp_tokens_est = len(final_answer.split()) * 4
        ai_cost_tracker.record_usage(
            tenant_id="default-civic-tenant",
            prompt_tokens=prompt_tokens_est,
            completion_tokens=comp_tokens_est,
            model=model_used or "llama-3.3-70b-versatile"
        )

        # 11. Save Assistant Message
        asst_msg = ChatMessage(
            session_id=session.id,
            sender="assistant",
            content=final_answer,
            citations=[c.model_dump() for c in citations]
        )
        db.add(asst_msg)
        db.commit()

        # Followups
        followups = [
            "Where is the nearest authorized recycling center?",
            "What are the penalties for illegal dumping?",
            "How should hazardous and chemical waste be packaged?"
        ]

        return ChatQueryResponse(
            answer=final_answer,
            citations=citations,
            session_id=session.id,
            suggested_followups=followups,
            confidence_score=round(confidence_score, 2),
            model_used=model_used,
            related_locations=related_locations,
            related_policies=related_policies
        )

    def sanitize_ai_output(self, text: str) -> str:
        """Removes raw markdown artifacts, noisy syntax, and cleans output for citizens."""
        if not text:
            return ""
        # Strip markdown headers (###, ##, #)
        cleaned = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
        # Strip horizontal divider rules
        cleaned = re.sub(r"^[-*_]{3,}\s*$", "", cleaned, flags=re.MULTILINE)
        # Remove noisy bracket citations like [Ref: ...]
        cleaned = re.sub(r"\[Ref:\s*[^\]]+\]", "", cleaned)
        cleaned = cleaned.replace("[]", "")
        # Remove raw markdown bold asterisks for clean text
        cleaned = cleaned.replace("**", "")
        # Replace raw arrows
        cleaned = cleaned.replace("→", " -> ")
        # Normalize duplicate spaces and line breaks
        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    def _local_synthesis(self, matched_item, retrieved, context_texts, response_mode: str = "auto") -> str:
        answer_parts = []
        if matched_item:
            if response_mode == "short":
                answer_parts.append(
                    f"Direct Guidance for {matched_item.name.title()}:\n\n"
                    f"• Segregation Bin: {matched_item.segregation_bin}\n"
                    f"• Disposal Method: {matched_item.disposal_method}\n"
                    f"• Safety Precaution: {matched_item.safety_precautions}"
                )
            else:
                answer_parts.append(
                    f"Guidance for {matched_item.name.title()}:\n\n"
                    f"• Segregation Bin: {matched_item.segregation_bin}\n"
                    f"• Disposal Method: {matched_item.disposal_method}\n"
                    f"• Recycling Potential: {matched_item.recycling_guidance}\n"
                    f"• Safety Precautions: {matched_item.safety_precautions}\n"
                )

        if context_texts and response_mode != "short":
            answer_parts.append("\nOfficial Policy & Environmental Guidelines:\n")
            for i, (chunk, score) in enumerate(retrieved, start=1):
                meta = chunk.chunk_metadata
                title = meta.get("title", "Regulation")
                lines = [l.strip() for l in chunk.chunk_text.split("\n") if l.strip() and not l.startswith("Policy Title:")]
                summary_line = " ".join(lines[:2]) if lines else chunk.chunk_text[:160]
                answer_parts.append(f"{i}. {title}: {summary_line}")
        elif not matched_item:
            answer_parts.append(
                "According to statutory municipal solid waste management rules, waste must be segregated "
                "at source into Wet Waste (Green bin), Dry Recyclable Waste (Blue bin), and Domestic Hazardous & Sanitary Waste (Red bin). "
                "For specialized electronic waste, drop off items at authorized e-waste centers on our Facilities Map."
            )
        return "\n".join(answer_parts)


rag_service = RAGService()
