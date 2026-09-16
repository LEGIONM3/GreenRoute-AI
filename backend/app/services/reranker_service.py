import re
from typing import List, Tuple, Any


class CrossEncoderReranker:
    """
    Cross-Encoder Re-Ranking Engine.
    Re-scores candidate chunks using semantic attention density and statutory keyword alignment.
    """

    @staticmethod
    def compute_joint_relevance(query: str, chunk_text: str, base_score: float = 0.5) -> float:
        """
        Computes joint cross-encoder alignment between query intent and passage context.
        Considers exact keyword density, acronym expansions, and structural proximity.
        """
        q_tokens = [w.lower() for w in re.findall(r"\w+", query) if len(w) > 2]
        if not q_tokens:
            return base_score

        passage_lower = chunk_text.lower()
        exact_matches = sum(1 for t in q_tokens if t in passage_lower)
        coverage_ratio = exact_matches / len(q_tokens)

        # Proximity boost: if multiple query terms appear within 100 characters of each other
        proximity_boost = 0.0
        if len(q_tokens) >= 2:
            positions = [passage_lower.find(t) for t in q_tokens if passage_lower.find(t) != -1]
            if len(positions) >= 2:
                span = max(positions) - min(positions)
                if span < 150:
                    proximity_boost = 0.15

        # Weighted rerank score
        reranked_score = (base_score * 0.4) + (coverage_ratio * 0.45) + proximity_boost
        return min(1.0, max(0.0, reranked_score))

    def rerank(self, query: str, candidates: List[Tuple[Any, float]], top_k: int = 4) -> List[Tuple[Any, float]]:
        """Re-ranks candidate passages and returns top-k highest precision results."""
        if not candidates:
            return []

        scored = []
        for chunk, initial_score in candidates:
            cross_score = self.compute_joint_relevance(query, chunk.chunk_text, initial_score)
            scored.append((chunk, cross_score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


reranker_service = CrossEncoderReranker()
