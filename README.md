# Running AI Assistant MVP

Telegram-first personal AI running and health assistant with Strava, Apple Health data import via Health Auto Export, deterministic readiness logic, and OpenRouter-assisted responses.

## Stack

- TypeScript / Node.js
- Fastify
- grammY
- PostgreSQL + Prisma
- OpenRouter chat completions over HTTPS
- Docker Compose
- Caddy
- Zod
- Vitest
- pino

## Project Layout

```text
/apps/api
  /src
  /prisma
  /tests
docker-compose.yml
Caddyfile
.env.example
README.md
AGENTS.md
```

## Local Setup

1. Copy `.env.example` to `.env` and fill the required secrets.
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the API locally:

```bash
npm run dev
```

5. Or start the full stack:

```bash
docker compose up --build
```

## Telegram Setup

1. Create a Telegram bot with BotFather.
2. Set `TELEGRAM_BOT_TOKEN`.
3. Set a strong `TELEGRAM_WEBHOOK_SECRET`.
4. Configure the webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/telegram/webhook",
    "secret_token": "'"${TELEGRAM_WEBHOOK_SECRET}"'"
  }'
```

## Strava Setup

1. Create a Strava API application.
2. Set:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
3. Configure the authorization callback URL:
   - `https://your-domain.com/auth/strava/callback`
4. Use `/connect_strava` in Telegram or open:
   - `GET /auth/strava/start?telegramId=<telegram-id>`

## Strava Webhook

Create the Strava webhook subscription against:

- Callback URL: `https://your-domain.com/webhooks/strava`
- Verify token: `STRAVA_VERIFY_TOKEN`

Strava requires the subscription challenge to be handled by `GET /webhooks/strava`.

## Health Auto Export Setup

The service accepts:

- `POST /webhooks/health-auto-export`
- `POST /webhooks/health-auto-export/:token`

Use the per-user `healthExportToken` where possible. For initial testing you can use the global `Authorization: Bearer HEALTH_EXPORT_API_KEY`.

Recommended Health Auto Export configuration:

- Method: `POST`
- Content-Type: `application/json`
- URL: `https://your-domain.com/webhooks/health-auto-export/<user-token>`
- Optional auth for shared endpoint: `Authorization: Bearer HEALTH_EXPORT_API_KEY`

## OpenRouter Setup

Set:

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-09-2025`
- `OPENROUTER_REQUEST_TIMEOUT_MS=120000`
- `OPENROUTER_MAX_TOKENS=450`

The app reads the model from env. It does not fine-tune on user data and sends only summarized deterministic training context to the AI model.

## Deploy on VPS

1. Install Docker and Docker Compose plugin.
2. Point DNS to the VPS.
3. Copy the repository and fill `.env`.
4. Export the domain hostname for Caddy:

```bash
export PUBLIC_BASE_URL_HOSTNAME=your-domain.com
```

5. Start services:

```bash
docker compose up -d --build
```

6. Check logs:

```bash
docker compose logs -f app
docker compose logs -f caddy
docker compose logs -f postgres
```

## Prisma Migrations

```bash
npm run prisma:migrate
```

Inside Docker, the app container runs `prisma migrate deploy` before starting the API.

## Data Privacy

- Strava tokens are encrypted at rest with AES-256-GCM.
- Sensitive fields are redacted from logs.
- Raw health payloads are not logged in production.
- `/privacy` explains retention and deletion.
- `/forget_me` deletes personal data.
- `/export_my_data` returns the user's stored summary.
- AI conversation logging is off by default unless `LOG_AI_MESSAGES=true`.

## Tests

```bash
npm test
```
