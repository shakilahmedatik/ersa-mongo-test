# Ersa Chat

A Bun-powered Turborepo monorepo for an AI-assisted chat application with:

- a static `Next.js` frontend
- a `Hono` backend
- cookie-session authentication with `Better Auth`
- persistent chat threads and memory with `Mastra`
- MongoDB-backed knowledge base management and ingestion

## Stack

### Monorepo

- `Bun`
- `Turborepo`
- `Biome`

### Frontend

- `Next.js` App Router
- `React`
- `Tailwind CSS`
- `shadcn/ui`
- `TanStack Query`
- `Vercel AI SDK`
- `Better Auth` client

### Backend

- `Hono`
- `Better Auth`
- `Mastra`
- `MongoDB`
- `Mongoose`
- `Pino`

### AI and retrieval

- chat model through `OpenRouter`
- embeddings through `google/gemini-embedding-001`
- vector storage through MongoDB

## Applications

### `apps/frontend`

Static Next.js frontend with:

- landing page
- sign-in and sign-up pages
- responsive chat interface
- thread sidebar
- admin dashboard for knowledge base management

The frontend is built as a static export. All data fetching and chat interactions are client-side.

### `apps/backend`

Hono backend with:

- email/password authentication
- cookie sessions
- chat threads
- streamed assistant responses
- rate limiting
- persistent memory
- knowledge base CRUD
- knowledge ingestion jobs
- admin APIs

## Features

- Email and password sign-up/login
- Cookie-based authenticated sessions
- Persistent chat threads per user
- Streaming chat responses
- Backend-managed chat memory
- MongoDB-backed knowledge base
- Admin dashboard for knowledge documents and ingestion jobs
- Request logging and structured application logs
- Dockerized local environment with MongoDB Community + `mongot`

## Project structure

```text
.
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── config/
│   │   │   ├── features/
│   │   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   ├── chat/
│   │   │   │   ├── knowledge/
│   │   │   │   └── users/
│   │   │   ├── infrastructure/
│   │   │   │   ├── ai/
│   │   │   │   ├── auth/
│   │   │   │   ├── database/
│   │   │   │   └── logging/
│   │   │   └── middleware/
│   │   └── Dockerfile
│   └── frontend/
│       ├── app/
│       ├── components/
│       ├── config/
│       ├── features/
│       ├── lib/
│       └── Dockerfile
├── docker/
│   └── mongodb/
├── docker-compose.yml
├── render.yaml
└── vercel.json
```

## Requirements

- `Bun 1.3.10+`
- `Node.js` is not required for normal project workflows
- `Docker` and `Docker Compose` if you want the local container stack
- a MongoDB instance
- an `OpenRouter` API key
- a `Google Generative AI` API key for embeddings

## Environment variables

### Frontend

Create `apps/frontend/.env.local` or copy from `apps/frontend/.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Backend

Copy `apps/backend/.env.example` to `apps/backend/.env`.

Required:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/ersa-chat?replicaSet=rs0
MONGODB_DB_NAME=ersa-chat
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAILS=admin@example.com
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
MASTRA_ASSISTANT_MODEL=openrouter/anthropic/claude-haiku-4-5
KNOWLEDGE_EMBEDDING_MODEL=google/gemini-embedding-001
KNOWLEDGE_EMBEDDING_DIMENSIONS=3072
KNOWLEDGE_VECTOR_INDEX_NAME=knowledge_base_embeddings
CHAT_RATE_LIMIT_WINDOW_SECONDS=3600
CHAT_RATE_LIMIT_MAX_REQUESTS=30
CHAT_MEMORY_LAST_MESSAGES=24
CHAT_COMPLETION_MAX_TOKENS=2048
KNOWLEDGE_INGESTION_STALE_AFTER_MS=1800000
KNOWLEDGE_INGESTION_PROGRESS_FLUSH_EVERY_DOCS=5
LOG_LEVEL=info
```

## Installation

From the repo root:

```bash
bun install
```

## Local development

Run both apps from the repo root:

```bash
bun dev
```

Default local URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

### Run apps separately

Frontend:

```bash
cd apps/frontend
bun dev
```

Backend:

```bash
cd apps/backend
bun dev
```

## Build and run

Build the monorepo:

```bash
bun run build
```

Run the built apps:

```bash
bun run start
```

## Quality checks

From the repo root:

```bash
bun run lint
bun run check
bun run build
```

Per app:

```bash
cd apps/frontend
bun run lint
bun run check

cd ../backend
bun run lint
bun run check
```

## Docker

This repo includes a local Docker stack with:

- static frontend served by `Caddy`
- backend container
- `mongod`
- `mongot`

The Docker MongoDB setup is intended for local development only.

### Start the stack

1. Copy `docker-compose.env.example` to `.env` in the repo root.
2. Fill the required secrets.
3. Start the stack:

```bash
docker compose up --build
```

Or use the root scripts:

```bash
bun run docker:build
bun run docker:up
```

Stop it with:

```bash
bun run docker:down
```

Default Docker URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27017`

## API overview

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

### Chat

- `GET /chat`
- `GET /chat/rate-limit`
- `GET /chat/threads`
- `POST /chat/threads`
- `PATCH /chat/threads`
- `DELETE /chat/threads?threadId=...`
- `GET /chat/history?threadId=...`
- `POST /chat/stream`

### Admin

- `GET /admin/me`

### Knowledge base

- `GET /admin/knowledge`
- `POST /admin/knowledge`
- `GET /admin/knowledge/:id`
- `PATCH /admin/knowledge/:id`
- `POST /admin/knowledge/:id/publish`
- `POST /admin/knowledge/:id/draft`
- `DELETE /admin/knowledge/:id`
- `POST /admin/knowledge/ingest`
- `GET /admin/knowledge/ingest/jobs`
- `GET /admin/knowledge/ingest/jobs/:id`

## Recommended deployment

Recommended free-tier setup:

- frontend on `Vercel`
- backend on `Render`
- database on `MongoDB Atlas`

Why:

- the frontend is already a static export
- Vercel is a strong fit for the frontend only
- Render can run the backend
- Atlas is the practical production database choice

Do not use the local `docker-compose` MongoDB stack as your production database.

## Deployment files

- `render.yaml`: Render Docker deployment blueprint
- `vercel.json`: Vercel frontend-only configuration
- `DEPLOYMENT.md`: deployment walkthrough

## Notes

- The frontend is static. No Next.js server features are used for application logic.
- Chat, auth, rate limiting, memory, and knowledge retrieval are backend-managed.
- The backend is intentionally strict about missing environment variables and database readiness during startup.
- The chat UI is optimized to avoid unnecessary frontend polling and redundant backend calls.

## License

No license file is currently included in this repository.
