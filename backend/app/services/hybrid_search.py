import math
import re
from typing import List, Dict, Any, Tuple


class BM25LexicalScorer:
    """
    In-memory BM25 (Best Matching 25) implementation for statutory legal text.
    Handles domain terms (e.g. 'e-waste', 'hazardous', 'single-use plastic').
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    @staticmethod
    def tokenize(text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        return [w for w in cleaned.split() if len(w) > 2]

    def score(self, query: str, documents: List[str]) -> List[float]:
        """Calculates BM25 scores for a list of document texts against the query."""
        if not documents:
            return []

        tokenized_docs = [self.tokenize(doc) for doc in documents]
        query_terms = self.tokenize(query)
        doc_count = len(documents)
        avg_doc_len = sum(len(d) for d in tokenized_docs) / max(1, doc_count)

        # Term document frequency
        df: Dict[str, int] = {}
        for q in set(query_terms):
            df[q] = sum(1 for d in tokenized_docs if q in d)

        scores = []
        for d_tokens in tokenized_docs:
            d_len = len(d_tokens)
            doc_score = 0.0
            term_counts: Dict[str, int] = {}
            for t in d_tokens:
                term_counts[t] = term_counts.get(t, 0) + 1

            for q in query_terms:
                tf = term_counts.get(q, 0)
                if tf > 0:
                    idf = math.log((doc_count - df[q] + 0.5) / (df[q] + 0.5) + 1.0)
                    denom = tf + self.k1 * (1.0 - self.b + self.b * (d_len / avg_doc_len))
                    doc_score += idf * (tf * (self.k1 + 1.0)) / max(1e-6, denom)
            scores.append(doc_score)

        return scores


class HybridSearchEngine:
    """
    Hybrid Retrieval Engine combining Dense Semantic Vector Search + BM25 Lexical Scoring
    via Reciprocal Rank Fusion (RRF).
    """

    RRF_K = 60

    def __init__(self):
        self.bm25 = BM25LexicalScorer()

    def fuse_ranks(
        self,
        vector_candidates: List[Tuple[Any, float]],
        query: str
    ) -> List[Tuple[Any, float]]:
        """
        Fuses vector ranking with BM25 lexical ranking using Reciprocal Rank Fusion.
        vector_candidates: List of (chunk_object, vector_similarity_score)
        """
        if not vector_candidates:
            return []

        doc_texts = [c[0].chunk_text for c in vector_candidates]
        bm25_scores = self.bm25.score(query, doc_texts)

        # Sort indices by BM25
        bm25_ranked_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
        bm25_rank_map = {idx: rank + 1 for rank, idx in enumerate(bm25_ranked_indices)}

        # Vector rankings are already sorted by similarity
        fused: List[Tuple[Any, float]] = []
        for vec_rank, (chunk, vec_score) in enumerate(vector_candidates, start=1):
            idx = vec_rank - 1
            lex_rank = bm25_rank_map.get(idx, len(vector_candidates))

            # RRF Formula
            rrf_score = (1.0 / (self.RRF_K + vec_rank)) + (1.0 / (self.RRF_K + lex_rank))
            fused.append((chunk, rrf_score))

        fused.sort(key=lambda x: x[1], reverse=True)
        return fused


hybrid_search = HybridSearchEngine()
