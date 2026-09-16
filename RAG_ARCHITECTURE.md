# Grounded AI RAG Architecture & LPU Inference Engine

## 1. Pipeline Overview
WasteCare implements an enterprise Retrieval-Augmented Generation (RAG) pipeline designed for low latency, zero hallucinations, and verifiable policy citation.

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant API as FastAPI Chat Endpoint
    participant Cache as Hybrid Cache (L1/L2)
    participant Embed as Embedding Service
    participant VectorDB as PostgreSQL (pgvector)
    participant Rerank as Cross-Encoder Reranker
    participant Groq as Groq LPU (Llama-3.3-70b)

    Citizen->>API: POST /chat/query ("How to dispose lithium batteries?")
    API->>Cache: Check semantic query cache
    alt Cache Hit
        Cache-->>API: Return cached answer & verified policy citations
        API-->>Citizen: Sub-50ms Response
    else Cache Miss
        API->>Embed: Generate 384-d normalized dense vector
        Embed->>VectorDB: Hybrid Search (HNSW Cosine + BM25 Lexical)
        VectorDB-->>API: Top 15 candidate chunks
        API->>Rerank: Rerank candidates by policy relevance score
        Rerank-->>API: Top 4 grounded contexts
        API->>Groq: Stream prompt with strict context fence
        Groq-->>API: Grounded policy guidance + official circular numbers
        API->>Cache: Store response in L1/L2 cache (TTL 1800s)
        API-->>Citizen: Sub-2s Response
    end
```

---

## 2. Ingestion & Chunking Strategy
- **Document Formats**: PDF, DOCX, Markdown regulatory circulars.
- **Chunk Size**: 512 tokens with 64 token sliding window overlap.
- **Metadata Tagging**: Each chunk is tagged with `tenant_id`, `policy_id`, `category`, `effective_date`, and `penalty_clause`.

---

## 3. High-Availability LLM Fallback Hierarchy

| Priority | Provider | Model | Typical Latency | SLA Guarantee |
|---|---|---|---|---|
| **Primary** | Groq LPU | `llama-3.3-70b-versatile` | **~450ms** | 99.9% uptime |
| **Fallback 1** | Groq LPU | `qwen/qwen3.8-27b` | **~350ms** | Automatic switch on rate-limit |
| **Fallback 2** | Google Cloud | `gemini-1.5-flash` | **~1100ms** | Disaster fallback |
| **Fallback 3** | OpenAI | `gpt-4o-mini` | **~1200ms** | Cold reserve |
