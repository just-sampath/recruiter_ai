# ATS Candidate Search System

A production-ready Applicant Tracking System (ATS) with natural language candidate search capabilities. Built with Bun, Hono, PostgreSQL, Qdrant, and BullMQ.

---

## Table of Contents

1. [Architecture and Components](#architecture-and-components)
2. [Data Model and Excel Ingestion](#data-model-and-excel-ingestion)
3. [Query Understanding](#query-understanding)
4. [Ranking Approach](#ranking-approach)
5. [Real-Time Updates](#real-time-updates)
6. [Assumptions, Trade-offs, and Future Improvements](#assumptions-trade-offs-and-future-improvements)
7. [Quick Start](#quick-start)
8. [Configuration](#configuration)
9. [Operator Security Checklist](#operator-security-checklist)

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
| **Middleware** | `src/middleware/` | JWT authentication, error handling, internal-init token gate |
| **Utils** | `src/utils/` | Constants, helpers, error classes |

### Key Services

| Service | File | Responsibility |
|---------|------|----------------|
| **IndexingOrchestrator** | `core/managers/IndexingOrchestrator.js` | Sole owner of index enqueue (UPSERT/DELETE) and Qdrant collection recreate |
| **QdrantService** | `core/services/Qdrant.js` | Vector storage with hybrid (dense + sparse) search using RRF fusion |
| **GeminiEmbedding** | `core/services/GeminiEmbedding.js` | Dense embedding generation via Google Gemini |
| **SparseEmbedding** | `core/services/SparseEmbedding.js` | Sparse embeddings (BM42 when enabled, else tokenizer fallback) |
| **QueryExtractor** | `query/services/QueryExtractor.js` | LLM-powered query classification and filter extraction |
| **FilterBuilder** | `query/filters/FilterBuilder.js` | Shared filter normalization for SQL and Qdrant paths |
| **ScoreNormalizer** | `query/scoring/ScoreNormalizer.js` | Maps path-specific scores to API `match_score` in **[0, 1]** |
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

The system uses interconnected tables organized around candidates, jobs, and the interview pipeline:

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
| `screening_answers` | Screening Q&A text | answer text (indexed as `screening_answer`) |
| `indexing_queue` | Async indexing status | event_type, doc_type, status, retry_count |

### Excel Ingestion Process

The system ingests data via a multi-sheet XLSX file through **`POST /api/import/xlsx`** (superadmin JWT required):

**Supported Sheets:**
- `jobs`, `candidates`, `candidate_resumes`, `skills`, `candidate_skills`
- `job_applications`, `screening_questions`, `screening_answers`
- `one_way_interviews`, `one_way_transcripts`, `recruiter_comments`
- `interviews`, `interview_transcripts`, `interview_scorecards`

**Sample file:** `data/candidates_data.xlsx`

**Ingestion Flow:**

```
1. Upload XLSX file via multipart form (field: file)
   Optional form field: shouldTruncate=true|false
           |
           v
2. Parse workbook with SheetJS (xlsx library)
           |
           v
3. If shouldTruncate: TRUNCATE Postgres tables, then
   IndexingOrchestrator.recreateCollection() on Qdrant
           |
           v
4. Process sheets in dependency order
   (jobs -> candidates -> applications -> interviews...)
           |
           v
5. Validate and insert/update records in PostgreSQL
   - Handle duplicates gracefully (skip or update)
   - Foreign key resolution via temp ID mapping
           |
           v
6. Enqueue indexing via IndexingOrchestrator for:
   resumes, interview/one-way transcripts, recruiter comments,
   screening_answers (deduped per import scope)
           |
           v
7. Background worker processes queue
   (embed text -> upsert to Qdrant)
```

**Key Features:**
- Superadmin-only import; truncate is destructive for Postgres **and** the Qdrant collection
- Resume rows **do** enqueue indexing (via `enqueueResume` / `enqueueLatestResumeForCandidate`)
- Screening answers are indexed as doc type `screening_answer`
- Import response includes indexing enqueue stats (`enqueued`, `by_type`, etc.)

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

Filters from extraction are normalized through **FilterBuilder** so structured SQL and hybrid Qdrant payload filters stay aligned.

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
2. Relevant info is spread across resumes, transcripts, comments, and screening answers
3. Exact matches miss semantically similar content

Our hybrid approach combines:
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
           |  Aggregation  |  (by candidate; sourceWeights)
           +---------------+
                   |
                   v
           +---------------+
           | ScoreNormalizer|  match_score in [0, 1]
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
| **Dense** | `gemini-embedding-001` (1536d, Cosine) | Semantic similarity, conceptual matching |
| **Sparse** | BM42 (if `BM42_ENABLE=true`) or tokenizer fallback | Keyword matching, exact term recall |

### Reranking Options

1. **Cohere Rerank**: Fast cross-encoder reranking (`rerank-v3.5` by default)
2. **LLM Reranker**: Uses Gemini to evaluate semantic relevance with explanations

The LLM reranker is particularly useful for semantic and hybrid searches because it:
- Considers candidate context across documents
- Generates per-candidate explanations
- Understands nuanced recruiting queries

### Scoring and API contract

**All search responses expose `match_score` in \[0, 1\]** via `ScoreNormalizer`:
- Structured path: raw heuristic 0–100 → divided by 100
- Cohere / LLM relevance: already ~0–1, clamped

Structured heuristic components (before normalization) include interview scorecards, immediate-joiner bonus, and notice period. Frontend match colors use thresholds on the 0–1 scale (e.g. ≥0.7 / ≥0.5).

**sourceWeights** (config) weight max-hit aggregation per candidate, including `screening_answer`:

```json
"sourceWeights": {
  "resume": 1,
  "interview_transcript": 1.2,
  "one_way_transcript": 1,
  "recruiter_comment": 0.9,
  "screening_answer": 1
}
```

---

## Real-Time Updates

### Indexing Architecture

Indexing side effects go through **IndexingOrchestrator** (import + API write paths). The worker never enqueues; it only processes queue rows.

```
Write path (import XLSX or API create/update)
        |
        v
+------------------------+
| IndexingOrchestrator   |
| enqueue UPSERT/DELETE  |
+------------------------+
        |
        v
+-------------------+
|  indexing_queue   |  (PostgreSQL)
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
        +----> Upsert / delete points in Qdrant
        |
        v
+-------------------+
|  indexing_queue   |
|  status: completed|
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
- **Overlap**: `floor(1500 * 0.15)` = **225** tokens between chunks
- **Tokenizer**: GPT tokenizer for consistent splitting

Each chunk gets a stable UUID based on `(doc_type, source_id, chunk_index)` for idempotent upserts. Orphan higher `chunk_index` points from a previously longer document are deleted after re-embed.

### Queue Configuration

```javascript
{
  queue: "process-documents",
  concurrency: 5,
  maxRetries: 3,
  batchSize: 25
}
```

### Indexing Status Tracking

The `indexing_queue` table tracks:
- `status`: `pending` → `processing` → **`completed`** (or `failed`) — not `indexed`
- `retry_count`: Number of retry attempts
- `error_message`: Last error for debugging
- `processed_at`: Completion timestamp

### Orchestrator call sites (examples)

- Import XLSX: resumes, screening answers, transcripts, comments
- Candidate resume create/update
- Interview transcript create
- One-way transcript create
- Recruiter comment create (applications path)
- Import truncate: `recreateCollection()` after Postgres TRUNCATE

---

## Assumptions, Trade-offs, and Future Improvements

### Assumptions

1. **XLSX as primary bulk source of truth**: Excel import is the main bulk ingestion path; live API writes also enqueue indexing via the orchestrator
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
| **PostgreSQL for queue state** | Simpler ops | Less scalable than a dedicated queue DB alone |
| **BullMQ worker in-process** | Easier deployment | Can't scale workers independently |
| **Qdrant Cloud recreate on truncate** | Clean slate, Cloud-safe delete+create | Irreversible; Cloud I/O cost |

### Limitations

1. **Cold start latency**: First query loads models and warms caches
2. **Document updates re-embed**: Upserts are idempotent by stable point IDs; full re-chunk/re-embed on content change
3. **Single Qdrant collection**: All doc types share one collection (`qdrant.collection`, default `candidates`); payload filtering separates types
4. **No query caching**: Repeated queries re-execute full pipeline
5. **Compose frontend is Vite dev only**: `Dockerfile.frontend` runs `bun run dev` — not a production static build

### Future Improvements

1. **Skill hierarchy for smarter filtering**: Enable queries like "Backend engineers" to automatically include Node.js, Python, Go, etc.
2. **Multi-tenant support**: Organization-scoped collections and data isolation for SaaS deployment
3. **Learned-to-rank reranker**: Train on recruiter clicks and hire outcomes for domain-specific ranking optimization
4. **Production frontend image**: Multi-stage static build (out of current scope)

---

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Set at least: GOOGLE_API_KEY, JWT_SECRET
   # Optional: COHERE_API_KEY, OPENAI_API_KEY, INTERNAL_INIT_TOKEN, BM42_ENABLE
   # Local Qdrant: QDRANT_URL=http://localhost:6333
   # Qdrant Cloud:
   #   QDRANT_URL=https://YOUR-CLUSTER.cloud.qdrant.io
   #   QDRANT_API_KEY=your-key
   ```

3. Start infrastructure:
   ```bash
   docker-compose up -d  # PostgreSQL, Redis, Qdrant (+ optional backend/frontend)
   ```
   Compose maps (defaults): backend `3005`, frontend `5175` (Vite **dev** server), Qdrant `6333`, Postgres `5445`.

4. Run migrations:
   ```bash
   bun run src/core/db/migrate.js
   ```

5. Start the server (local, outside compose):
   ```bash
   bun run src/index.js
   ```

6. Import sample data (superadmin JWT required):
   ```bash
   curl -X POST http://localhost:3000/api/import/xlsx \
     -F "file=@data/candidates_data.xlsx" \
     -H "Authorization: Bearer <superadmin_token>"
   ```
   Optional truncate (destroys Postgres candidate/job data **and** recreates the Qdrant collection):
   ```bash
   curl -X POST http://localhost:3000/api/import/xlsx \
     -F "file=@data/candidates_data.xlsx" \
     -F "shouldTruncate=true" \
     -H "Authorization: Bearer <superadmin_token>"
   ```

7. Search candidates:
   ```bash
   curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <recruiter_or_superadmin_token>" \
     -d '{"query": "Senior backend engineers in Bangalore with Kubernetes experience"}'
   ```

---

## Configuration

Configuration is managed via `config/default.json` (override with `NODE_CONFIG_ENV` / env vars as used by the services):

```json
{
  "llm": { "provider": "gemini", "model": "gemini-2.5-pro" },
  "embedding": {
    "provider": "gemini",
    "model": "gemini-embedding-001",
    "dimensions": 1536
  },
  "reranker": { "provider": "cohere", "model": "rerank-v3.5" },
  "vectordb": { "provider": "qdrant" },
  "qdrant": {
    "url": "http://localhost:6333",
    "apiKey": "",
    "collection": "candidates",
    "dense": { "name": "text-dense", "size": 1536, "distance": "Cosine" },
    "sparse": { "name": "text-sparse" }
  },
  "search": {
    "defaultTopK": 3,
    "maxTopK": 20,
    "rerankFetchMultiplier": 25,
    "sourceWeights": {
      "resume": 1,
      "interview_transcript": 1.2,
      "one_way_transcript": 1,
      "recruiter_comment": 0.9,
      "screening_answer": 1
    }
  },
  "queue": { "name": "process-documents", "concurrency": 5 },
  "auth": { "jwtSecret": "replace-me", "tokenExpiresIn": "1d" },
  "internal": { "initToken": "" }
}
```

**Collection name:** only `qdrant.collection` is used at runtime (`QdrantService`). `vectordb.provider` selects the vector backend; there is no separate `vectordb.collection`.

**Env overrides of note:**
| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | Gemini LLM + embeddings (preferred) |
| `GEMINI_API_KEY` | Optional alias for dense embeddings |
| `QDRANT_URL` / `QDRANT_API_KEY` | Local or Cloud Qdrant |
| `JWT_SECRET` | JWT signing |
| `INTERNAL_INIT_TOKEN` | Gates `/api/internal/init` (empty → 503) |
| `BM42_ENABLE=true` | Higher-quality sparse path |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | First-boot bootstrap user |

---

## Operator Security Checklist

1. Set **`JWT_SECRET`** to a long random value (never leave `replace-me` in shared environments).
2. Set **`SUPERADMIN_PASSWORD`** on first boot; rotate after bootstrap.
3. Set **`INTERNAL_INIT_TOKEN`** before enabling internal init in any shared environment; leave empty only if you intentionally want init disabled (503).
4. Set **`GOOGLE_API_KEY`** (and Cohere/OpenAI keys as needed); **never commit `.env`**.
5. For **Qdrant Cloud**, set `QDRANT_URL` + `QDRANT_API_KEY`; restrict API key scope if the provider supports it.
6. Treat **import truncate** as production data loss for candidates/jobs **and** vectors (collection recreate is irreversible).
7. Import is **superadmin-only**; do not expose the API without auth.
