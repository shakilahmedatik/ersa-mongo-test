# Docker Setup

This project ships with a Docker Compose stack modeled after the reference project:

- `frontend`: static Next.js export served by Caddy
- `backend`: Bun/Hono service built from the Turborepo workspace
- `mongod` + `mongot`: MongoDB Community Edition with local vector search enabled

## Usage

1. Copy `docker-compose.env.example` to `.env` in the repo root.
2. Fill in the required API keys and auth secret.
3. Start the stack:

```bash
docker compose up --build
```

## Endpoints

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27017`

## Notes

- The frontend is a static export, so `NEXT_PUBLIC_API_BASE_URL` is baked in at image build time.
- The Mongo vector-search setup is intended for local development, not production hardening.
