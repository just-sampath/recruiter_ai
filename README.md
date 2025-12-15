# Whitecarrot Natural Language Candidate Search

Production-ready Bun/Hono service implementing hybrid dense+sparse candidate search with Qdrant, BullMQ background indexing, and DI via `js-dep-injector`.

## Quick Start

1. Install dependencies: `bun install`
2. Copy env: `cp .env.example .env` and fill API keys (OpenAI/Gemini/Cohere, Qdrant if secured).
3. Run Postgres/Redis/Qdrant with Docker: `docker-compose up -d`
4. Apply schema (Drizzle): `bun run src/core/db/migrate.js`
5. Start app: `bun run src/index.js` (default port 3000)

## Key Flows

- **Auth**: `/api/auth/candidate/register|login`, `/api/auth/recruiter/login`
- **Jobs**: CRUD `/api/jobs`, candidate apply `/api/jobs/:id/apply`
- **Interviews**: transcripts `/api/interviews/:id/transcript`, scorecards `/api/interviews/:id/scorecard`
- **Search**: `/api/search` (recruiter auth) → extracts filters via LLM → dense + sparse embeddings → Qdrant hybrid search (RRF) → Cohere rerank → LLM explanations
- **Indexing**: DB events enqueue to BullMQ `process-documents`; worker fetches text, generates dense/sparse vectors, upserts to Qdrant, and tracks status in `indexing_queue`.

## Configuration

- `config/default.json` selects providers (llm/openai|gemini, embedding/openai|gemini, vectordb/qdrant, reranker/cohere) and paths to ONNX sparse model in `/models`.
- `auth` block controls JWT secret/expiry and bcrypt rounds.
- `queue` config drives BullMQ queue name, retries, concurrency.

## Development

- Lint/format: `bun run check`
- Drizzle config: `drizzle.config.js`
- Biome config: `biome.json`
- DI container: `src/core/container.js` (registers config/db/logger/services/managers/queues/query/preprocess)

## Notes

- Sparse embeddings use BM42 ONNX assets from `/models/models--Qdrant--bm42-all-minilm-l6-v2-attentions`; falls back to tokenizer-based TF weights if native runtime unavailable.
- Qdrant hybrid search uses dual searches (dense + sparse) fused via reciprocal rank to mimic prefetch+RRF.
- All code is ES Modules with JSDoc on exported APIs; no TypeScript.
