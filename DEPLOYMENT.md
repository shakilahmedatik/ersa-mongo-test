# Deployment

## Recommended production layout

- Frontend: Vercel or Render
- Backend: Render
- Database: MongoDB Atlas

The local `docker-compose` MongoDB Community + `mongot` stack is for local development. Do not use it as your production database on free hosting.

## Render

This repo includes [render.yaml](/Users/shakilahmedatik/Development/ersa-chat/render.yaml) for a two-service Docker deployment:

- `ersa-chat-backend`
- `ersa-chat-frontend`

### Important notes

- Render free web services spin down after inactivity, so chat will have cold starts.
- Use MongoDB Atlas for `MONGODB_URI`.
- Set the frontend `NEXT_PUBLIC_API_BASE_URL` to your deployed backend public URL.
- Set backend `BETTER_AUTH_URL` to the same backend public URL.
- Set backend `CORS_ORIGINS` to your deployed frontend public URL.

### Render backend envs

Required:

- `MONGODB_URI`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGINS`
- `ADMIN_EMAILS`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `OPENROUTER_API_KEY`

Usually keep these defaults:

- `MONGODB_DB_NAME=ersa-chat`
- `MASTRA_ASSISTANT_MODEL=openrouter/anthropic/claude-haiku-4-5`
- `KNOWLEDGE_EMBEDDING_MODEL=google/gemini-embedding-001`
- `KNOWLEDGE_EMBEDDING_DIMENSIONS=3072`
- `KNOWLEDGE_VECTOR_INDEX_NAME=knowledge_base_embeddings`
- `CHAT_RATE_LIMIT_WINDOW_SECONDS=3600`
- `CHAT_RATE_LIMIT_MAX_REQUESTS=30`
- `CHAT_MEMORY_LAST_MESSAGES=24`
- `CHAT_COMPLETION_MAX_TOKENS=2048`

### Render deployment order

1. Create the backend service from the Blueprint or from [render.yaml](/Users/shakilahmedatik/Development/ersa-chat/render.yaml).
2. Fill all backend secret env vars.
3. Deploy the backend and copy its public URL.
4. Set frontend `NEXT_PUBLIC_API_BASE_URL` to that backend URL.
5. Set backend `CORS_ORIGINS` to the frontend URL after the frontend is created.
6. Redeploy both services once.

## Vercel

Vercel cannot deploy your full Docker stack. It can deploy the frontend only.

This repo includes [vercel.json](/Users/shakilahmedatik/Development/ersa-chat/vercel.json) for the static frontend export from the monorepo root.

### Vercel setup

1. Import the repo into Vercel.
2. Keep the project root at the repo root.
3. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL.
4. Deploy.

The backend must be deployed elsewhere, such as Render.

## Suggested free-tier setup

- Frontend on Vercel
- Backend on Render free web service
- MongoDB Atlas free tier

That is the practical free-tier combination for this repo.
