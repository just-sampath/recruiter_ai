# Whitecarrot ATS Candidate Search System

A production-ready Applicant Tracking System (ATS) with natural language candidate search capabilities. Built with Bun, Hono, PostgreSQL, Qdrant, and BullMQ.

---

## Table of Contents

1. [Architecture and Components](#architecture-and-components)
2. [Data Model and Excel Ingestion](#data-model-and-excel-ingestion)
3. [Query Understanding](#query-understanding)
4. [Ranking Approach](#ranking-approach)
5. [Real-Time Updates](#real-time-updates)
6. [Assumptions, Trade-offs, and Future Improvements](#assumptions-trade-offs-and-future-improvements)

---

## Architecture and Components

### High-Level Architecture

```
                                    +-------------------+
                                    |   Hono REST API   |
                                    +--------+----------+
                                             |
              +------------------------------+------------------------------+
              |                              |                              |
    +---------v---------+         +----------v----------+        +----------v----------+
    |   Query Layer     |         |    Core Layer       |        |   Preprocess Layer  |
    |  (Search/Extract) |         | (DB/Managers/Svcs)  |        |  (Doc Processing)   |
    +-------------------+         +---------------------+        +---------------------+
              |                              |                              |
              |                   +----------v----------+                   |
              +------------------>|    Data Stores      |<------------------+
                                  | PostgreSQL | Qdrant |
                                  |   Redis (BullMQ)    |
                                  +---------------------+
```

### Component Breakdown

| Layer | Directory | Purpose |
|-------|-----------|---------|
| **API** | `src/routes/` | REST endpoints for auth, jobs, candidates, interviews, search, import |
| **Core** | `src/core/` | Database schemas, managers (business logic), services (external integrations), queues |
| **Query** | `src/query/` | Search orchestration, query extraction, reranking, explanation generation |
| **Preprocess** | `src/preprocess/` | Document processing, text chunking, embedding generation |
| **Middleware** | `src/middleware/` | JWT authentication, error handling |
| **Utils** | `src/utils/` | Constants, helpers, error classes |

### Key Services

| Service | File | Responsibility |
|---------|------|----------------|
| **QdrantService** | `core/services/Qdrant.js` | Vector storage with hybrid (dense + sparse) search using RRF fusion |
| **GeminiEmbedding** | `core/services/GeminiEmbedding.js` | Dense embedding generation via Google Gemini |
| **SparseEmbedding** | `core/services/SparseEmbedding.js` | BM42 sparse embeddings via ONNX runtime |
| **QueryExtractor** | `query/services/QueryExtractor.js` | LLM-powered query classification and filter extraction |
| **SearchHandler** | `query/handlers/search.js` | Three-tier search orchestration |
| **LLMReranker** | `query/services/LLMReranker.js` | Semantic reranking with explanations |
| **DocumentProcessor** | `preprocess/handlers/documentProcessor.js` | Text chunking, embedding, and vector upsert |

### Dependency Injection

All components are wired via `js-dep-injector` in `src/core/container.js`, enabling:
- Loose coupling between services
- Easy testing and mocking
- Centralized configuration management

---

## Data Model and Excel Ingestion

### Database Schema (PostgreSQL)

The system uses 17 interconnected tables organized around candidates, jobs, and the interview pipeline:

```
recruiters                     jobs
    |                           |
    |                           v
    |                    job_applications <----+
    |                        |    |            |
    v                        |    |            |
candidates <-----------------+    |            |
    |                             |            |
    +-- candidate_resumes         |            |
    +-- candidate_skills -------> skills       |
                                  |            |
                                  v            |
                            screening_questions|
                                  |            |
                                  v            |
                            screening_answers  |
                                               |
                            one_way_interviews |
                                  |            |
                                  v            |
                            one_way_transcripts|
                                               |
                            recruiter_comments |
                                               |
                            interviews --------+
                                |
                                +-- interview_transcripts
                                +-- interview_scorecards

indexing_queue (async processing status)
```

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `candidates` | Candidate profiles | location, experience, notice_period, salary, work_type |
| `candidate_resumes` | Resume text storage | resume_text (indexed for vector search) |
| `candidate_skills` | Skills mapping | links candidates to normalized skills |
| `jobs` | Job listings | title, department, location, description |
| `job_applications` | Application tracking | stage, source |
| `interviews` | Interview rounds | round_name, interview_at |
| `interview_transcripts` | Interview conversation text | transcript_text (indexed) |
| `interview_scorecards` | Structured evaluations | problem_solving, communication, ownership, culture_fit |
| `recruiter_comments` | Freeform evaluations | comment_text (indexed) |
| `one_way_transcripts` | Async video interview Q&A | question_text, answer_text (indexed) |
| `indexing_queue` | Async indexing status | event_type, doc_type, status, retry_count |

### Excel Ingestion Process

The system ingests data via a multi-sheet XLSX file through `POST /api/import`:

**Supported Sheets:**
- `jobs`, `candidates`, `candidate_resumes`, `skills`, `candidate_skills`
- `job_applications`, `screening_questions`, `screening_answers`
- `one_way_interviews`, `one_way_transcripts`, `recruiter_comments`
- `interviews`, `interview_transcripts`, `interview_scorecards`

**Ingestion Flow:**

```
1. Upload XLSX file via multipart form
           |
           v
2. Parse workbook with SheetJS (xlsx library)
           |
           v
3. Process sheets in dependency order
   (jobs -> candidates -> applications -> interviews...)
           |
           v
4. Validate and insert records into PostgreSQL
   - Handle duplicates gracefully (skip or update)
   - Foreign key resolution via temp ID mapping
           |
           v
5. Enqueue indexing jobs for searchable documents
   (resumes, transcripts, comments -> indexing_queue)
           |
           v
6. Background worker processes queue
   (embed text -> upsert to Qdrant)
```

**Key Features:**
- Transactional integrity with rollback on failure
- Duplicate handling (skip existing records)
- Foreign key resolution using temp-to-real ID mapping
- Automatic indexing trigger for searchable content

---

## Query Understanding

### Three-Tier Search Strategy

The system classifies every query into one of three search strategies:

| Level | Strategy | When Used | Example Query |
|-------|----------|-----------|---------------|
| **0** | Structured | Pure SQL filters on columns | "Immediate joiners in Delhi" |
| **1** | Hybrid | Qdrant filters + vector search | "Backend engineers in Bangalore who mention Kubernetes" |
| **2** | Semantic | Pure vector search on text | "Candidates who demonstrate strong ownership" |

### Query Extraction Pipeline

```
Natural Language Query
        |
        v
+-------------------+
|  QueryExtractor   |  (LLM with structured output)
+-------------------+
        |
        v
+-------+-------+--------------------+
|               |                    |
v               v                    v
search_strategy semantic_query  extracted_filters
(0/1/2)         (for embedding)  {locations, skills,
                                  experience, salary,
                                  notice_period, ...}
```

### Skill Normalization

Extracted skills are fuzzy-matched against the database skill list using Fuse.js:
- "react.js" -> "React"
- "kubernetes" -> "Kubernetes"
- "python3" -> "Python"

---

## Ranking Approach

### Why This Approach

Traditional keyword search fails for recruiting because:
1. Recruiters ask conceptual questions ("shows ownership")
2. Relevant info is spread across resumes, transcripts, and comments
3. Exact matches miss semantically similar content

Our hybrid approach combines the best of both worlds:
- **Structured filters** for hard constraints (location, experience, availability)
- **Semantic search** for conceptual matching (soft skills, culture fit)
- **Reranking** for precision on final results

### Ranking Pipeline

```
Query -> QueryExtractor -> Strategy Selection
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
   Structured              Hybrid                  Semantic
   (SQL only)        (SQL + Vector)           (Vector only)
        |                       |                       |
        v                       v                       v
   SQL Results          Qdrant Hybrid            Qdrant Dense
        |               (RRF Fusion)                    |
        |                       |                       |
        +----------+------------+-----------------------+
                   |
                   v
           +---------------+
           |   Reranking   |  (Cohere or LLM)
           +---------------+
                   |
                   v
           +---------------+
           |  Aggregation  |  (by candidate, keep best doc)
           +---------------+
                   |
                   v
           +---------------+
           |  Explanation  |  (LLM or deterministic)
           +---------------+
                   |
                   v
              Final Results
```

### Qdrant Hybrid Search with RRF

The system uses Reciprocal Rank Fusion (RRF) to combine dense and sparse search results:

```
RRF_score = sum(1 / (k + rank_dense)) + sum(1 / (k + rank_sparse))
```

Where k = 60 (standard constant to dampen high-ranking outliers).

**Why RRF?**
- No need to tune weights between dense and sparse
- Robust to score distribution differences
- Proven effective in hybrid retrieval benchmarks

### Dense vs Sparse Embeddings

| Type | Model | Purpose |
|------|-------|---------|
| **Dense** | gemini-embeddings-001 (1536d) | Semantic similarity, conceptual matching |
| **Sparse** | Qdrant AllMiniLM L6 with Attentions (BM25 variant) | Keyword matching, exact term recall |

### Reranking Options

1. **Cohere Rerank**: Fast, accurate cross-encoder reranking (focuses primarily on keyword and semantic matching)
2. **LLM Reranker** (Default): Uses Gemini to evaluate semantic relevance with explanations

The LLM reranker is particularly useful for semantic and hybrid searches because it:
- Considers full candidate context (all documents)
- Generates per-candidate explanations
- Understands nuanced recruiting queries

> **Note**: The cross-encoder reranker primarily looks for keyword and semantic matches. For deeper contextual understanding (e.g., evaluating soft skills or culture fit from transcripts), the LLM reranker provides better results at the cost of additional latency.

### Scoring Components

For structured search, deterministic scoring is used:
- **Interview Score** (0-50 points): Based on scorecard averages
- **Immediate Joiner** (0-30 points): Bonus for can_join_immediately
- **Notice Period** (0-20 points): Inversely proportional to days

---

## Real-Time Updates

### Indexing Architecture

```
Database Write (create/update candidate, resume, transcript, etc.)
        |
        v
+-------------------+
|  indexing_queue   |  (PostgreSQL table)
|  status: pending  |
+-------------------+
        |
        v
+-------------------+
|  BullMQ Worker    |  (process-documents queue)
+-------------------+
        |
        +----> Fetch document text
        |
        +----> Generate embeddings (dense + sparse)
        |
        +----> Upsert to Qdrant
        |
        v
+-------------------+
|  indexing_queue   |
|  status: indexed  |
+-------------------+
```

### Document Types Indexed

| doc_type | Source | Content |
|----------|--------|---------|
| `resume` | candidate_resumes | Full resume text |
| `interview_transcript` | interview_transcripts | Interview conversation |
| `recruiter_comment` | recruiter_comments | Freeform evaluations |
| `one_way_transcript` | one_way_transcripts | Async interview Q&A |
| `screening_answer` | screening_answers | Screening responses |

### Chunking Strategy

Long documents are chunked for better retrieval:
- **Max tokens**: 1500 per chunk
- **Overlap**: 200 tokens between chunks
- **Tokenizer**: GPT tokenizer for consistent splitting

Each chunk gets a stable UUID based on (doc_type, source_id, chunk_index) for idempotent upserts.

### Queue Configuration

```javascript
{
  queue: "process-documents",
  concurrency: 5,
  retries: 3,
  backoff: "exponential"
}
```

### Indexing Status Tracking

The `indexing_queue` table tracks:
- `status`: pending -> processing -> indexed (or failed)
- `retry_count`: Number of retry attempts
- `error_message`: Last error for debugging
- `processed_at`: Completion timestamp

---

## Assumptions, Trade-offs, and Future Improvements

### Assumptions

1. **XLSX as single source of truth**: The Excel import is the primary data ingestion mechanism; all candidate and job data originates from structured XLSX files
2. **Single-tenant deployment**: No multi-organization support; all data belongs to one company
3. **Moderate scale**: Designed for thousands to tens of thousands of candidates, not millions
4. **LLM availability**: Relies on external LLM APIs (Gemini/OpenAI) being available

### Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| **Speed vs Accuracy (2 LLM calls)** | High-quality query understanding + semantic reranking | Adds ~1-2s latency per search; increased API costs |
| **LLM for query extraction** | Handles complex natural language | Adds latency (~500ms); API costs |
| **Hybrid dense+sparse** | Better recall than either alone | Double embedding cost; more storage |
| **RRF fusion** | No weight tuning needed | Less control than learned fusion |
| **Chunking long docs** | Better semantic precision | More vectors to store/search |
| **PostgreSQL for queue** | Simpler ops (no separate queue DB) | Less scalable than dedicated queue |
| **BullMQ worker in-process** | Easier deployment | Can't scale workers independently |

### Limitations

1. **Cold start latency**: First query loads models and warms caches
2. **No incremental updates**: Document updates require full re-embedding (Point upserts are idempotent)
3. **Single Qdrant collection**: All doc types share one collection (payload filtering handles separation)
4. **No query caching**: Repeated queries re-execute full pipeline

### Future Improvements

1. **Skill hierarchy for smarter filtering**: Enable queries like "Backend engineers" to automatically include Node.js, Python, Go, etc.
2. **Multi-tenant support**: Organization-scoped collections and data isolation for SaaS deployment
3. **Learned-to-rank reranker**: Train on recruiter clicks and hire outcomes for domain-specific ranking optimization

---

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Set: DATABASE_URL, QDRANT_URL, GEMINI_API_KEY, COHERE_API_KEY
   ```

3. Start infrastructure:
   ```bash
   docker-compose up -d  # PostgreSQL, Redis, Qdrant
   ```

4. Run migrations:
   ```bash
   bun run src/core/db/migrate.js
   ```

5. Start the server:
   ```bash
   bun run src/index.js
   ```

6. Import sample data:
   ```bash
   curl -X POST http://localhost:3000/api/import/xlsx \
     -F "file=@data/sample.xlsx" \
     -H "Authorization: Bearer <admin_token>"
   ```

7. Search candidates:
   ```bash
   curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <recruiter_token>" \
     -d '{"query": "Senior backend engineers in Bangalore with Kubernetes experience"}'
   ```

---

## Configuration

Configuration is managed via `config/default.json`:

```json
{
  "llm": { "provider": "gemini", "model": "gemini-2.0-flash" },
  "embedding": { "provider": "gemini", "model": "text-embedding-004" },
  "reranker": { "provider": "cohere", "model": "rerank-v3.5" },
  "vectordb": { "provider": "qdrant" },
  "qdrant": {
    "collection": "candidates",
    "dense": { "size": 768, "distance": "Cosine" },
    "sparse": { "name": "text-sparse" }
  },
  "queue": { "name": "process-documents", "concurrency": 5 }
}
```

---

## License

Proprietary - Whitecarrot Technologies
