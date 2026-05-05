# Running AI Coach

Минимальный персональный AI-коуч для бега и восстановления. Продукт помогает быстро понять главное: можно ли сегодня тренироваться, насколько тяжело, что именно делать и не накапливается ли перегрузка.

Это не generic wellness dashboard и не медицинское приложение. Фокус только на беговом решении дня: готовность, нагрузка, план, последние тренировки и понятное объяснение.

## Зачем Нужен

Продукт закрывает ежедневный сценарий бегуна:

- стоит ли сегодня бежать или лучше восстановиться;
- какой тип тренировки выбрать: easy run, recovery, intervals, rest;
- как текущая нагрузка отличается от обычной базы;
- улучшается ли VO2 max / cardio fitness в долгую;
- почему коуч предлагает изменить план.

Главный пользовательский профиль: молодой runner, 4-5 пробежек в неделю, чаще 3-5 км easy Zone 2, цель - аккуратно улучшать VO2 max без агрессивного роста нагрузки.

## Что Сейчас Есть

### Web App

Next.js dashboard с основными разделами:

- `Dashboard`: рекомендация на сегодня, восстановление, сон, load status, VO2 max, последние тренировки.
- `Plan`: недельный план с возможностью отметить тренировку выполненной.
- `Coach`: action-based интерфейс с быстрыми командами и контекстом коуча.
- `Body`: вес, BMI и измерения без превращения этого в главный health dashboard.
- `Weekly Insights`: недельная сводка, открывается отдельно от основного nav.
- `Settings / Data`: настройки HR-зон, цели и источника данных.

### Backend

Fastify API отвечает за:

- прием Apple Health данных через Health Auto Export;
- Strava OAuth/webhook интеграцию;
- хранение данных в PostgreSQL;
- deterministic readiness/training logic;
- Telegram bot;
- безопасный web snapshot для frontend без raw health payloads и секретов.

### Telegram

Telegram остается conversational каналом: вопросы, объяснения, команды, экспорт/удаление данных. Но основной постоянный интерфейс теперь web app.

## Источники Данных

Web app по умолчанию берет актуальные агрегированные данные из PostgreSQL через backend API.

```text
Apple Watch / Apple Health
  -> Health Auto Export
  -> Fastify API
  -> PostgreSQL
  -> /web/health-snapshot
  -> Next.js web dashboard
```

Также поддерживаются или заложены в архитектуру:

- Apple Health export через Health Auto Export;
- Strava API;
- manual/backend import в будущем;
- mock data только для локального демо.

Важно: браузерный web app не может напрямую читать Apple Health. Данные должны сначала попасть в backend/database.

## Mock vs Real Data

Production поведение:

- `USE_MOCK_HEALTH_DATA=false` - web берет данные из backend/database.
- `USE_MOCK_HEALTH_DATA=true` - web использует локальный mock snapshot.

Если в базе нет импортированных workouts или daily health rows, dashboard не подставляет фейковые значения. Он покажет состояние ожидания данных.

## Training Logic

Ключевое правило: тренировочные решения должны идти из deterministic training engine, а не только из LLM-текста.

### Load Calculation

Нагрузка считается по минутам в пульсовых зонах:

```text
load = z1 * 1 + z2 * 2 + z3 * 3 + z4 * 5 + z5 * 7
```

Высокие зоны имеют больший коэффициент, потому что Zone 4/5 создают непропорционально больше усталости.

### Load Status

Сравнивается acute load за 7 дней и chronic baseline за 28 дней:

- `< 0.75`: well below;
- `0.75-0.90`: below;
- `0.90-1.10`: steady;
- `1.10-1.30`: above;
- `> 1.30`: well above;
- меньше 28 дней данных: building baseline.

### Readiness / Recovery

Recovery score - собственная coaching estimate, не медицинский показатель. В расчет входят доступные сигналы:

- sleep score / sleep duration;
- resting HR относительно baseline;
- HRV относительно baseline, если есть;
- respiratory rate, если есть;
- previous day и weekly training load.

Если часть данных отсутствует, расчет помечается как estimated или использует нейтральный фактор. Приложение не ставит диагнозы.

## Apple Watch SE 2 Constraints

Продукт не строится вокруг метрик, которых нет на Apple Watch SE 2:

- ECG;
- Blood Oxygen;
- wrist temperature;
- sleep apnea notifications.

Используются доступные и релевантные данные:

- workouts;
- heart rate;
- HR zones;
- sleep;
- resting HR;
- HRV, если импортируется;
- VO2 max / Cardio Fitness estimate;
- running distance, duration, pace.

## Project Layout

```text
apps/api
  prisma
  src
    health
    routes
    training
    telegram
    strava

apps/web
  app
    dashboard
    plan
    coach
    body
    insights
    settings
  components
  lib/health

docker-compose.yml
Caddyfile
.env.example
AGENTS.md
```

## Stack

- TypeScript
- Fastify
- Next.js App Router
- Tailwind CSS
- PostgreSQL
- Prisma
- grammY
- OpenRouter
- Docker Compose
- Caddy
- Zod
- Vitest
- pino

## Environment

Скопируй `.env.example` в `.env` и заполни значения:

```bash
cp .env.example .env
```

Ключевые переменные:

- `DATABASE_URL`: PostgreSQL connection string.
- `ADMIN_API_KEY`: внутренний ключ для server-side web -> API доступа.
- `INTERNAL_API_BASE_URL`: URL API для Next.js server runtime.
- `WEB_USER_ID` или `WEB_TELEGRAM_ID`: какой user показывается в web, если в базе несколько пользователей.
- `USE_MOCK_HEALTH_DATA=false`: брать реальные данные из БД.
- `HEALTH_EXPORT_API_KEY`: optional shared key для Health Auto Export endpoint.
- `ENCRYPTION_KEY`: ключ шифрования Strava tokens.
- `OPENROUTER_API_KEY`: LLM только для объяснений/разговорного интерфейса.

Для Docker Compose `INTERNAL_API_BASE_URL` выставляется как `http://app:3000` внутри `web` service.

## Local Setup

Установка зависимостей:

```bash
npm install
```

Prisma client и миграции:

```bash
npm run prisma:generate
npm run prisma:migrate
```

API:

```bash
npm run dev
```

Web:

```bash
npm run dev:web
```

По умолчанию:

- API: `http://localhost:3000`
- Web: `http://localhost:3001` или порт, который выберет Next.js, если 3001 занят.

Если видишь ошибку Next вида `Cannot find module ./*.js`, останови `next dev`, очисти кеш и запусти заново:

```bash
rm -rf apps/web/.next
npm run dev:web
```

## Health Auto Export Setup

Backend принимает Apple Health данные:

- `POST /webhooks/health-auto-export`
- `POST /webhooks/health-auto-export/:token`

Рекомендуемый вариант - использовать per-user `healthExportToken`:

```text
https://your-domain.com/webhooks/health-auto-export/<user-token>
```

Настройки Health Auto Export:

- Method: `POST`
- Content-Type: `application/json`
- URL: endpoint выше
- Optional shared auth: `Authorization: Bearer HEALTH_EXPORT_API_KEY`

Raw payload хранится server-side и не отдается во frontend snapshot.

## Strava Setup

1. Создай Strava API application.
2. Заполни `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_VERIFY_TOKEN`.
3. Callback URL:

```text
https://your-domain.com/auth/strava/callback
```

4. Подключение:

```text
GET /auth/strava/start?telegramId=<telegram-id>
```

Strava webhook:

```text
https://your-domain.com/webhooks/strava
```

Strava tokens хранятся зашифрованными.

## Telegram Setup

1. Создай bot через BotFather.
2. Заполни `TELEGRAM_BOT_TOKEN`.
3. Заполни `TELEGRAM_WEBHOOK_SECRET`.
4. Настрой webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/telegram/webhook",
    "secret_token": "'"${TELEGRAM_WEBHOOK_SECRET}"'"
  }'
```

Для локального polling можно использовать:

```text
TELEGRAM_USE_POLLING=true
```

## Deploy on VPS

Требования:

- Docker;
- Docker Compose plugin;
- 2 CPU / 4 GB RAM достаточно для MVP;
- открытые порты `80` и `443`;
- заполненный `.env` на сервере.

Запуск:

```bash
export PUBLIC_BASE_URL_HOSTNAME=your-domain.com
docker compose up -d --build
```

Compose поднимает:

- `app`: Fastify API, ingestion, Telegram, Strava, readiness engine, migrations.
- `web`: Next.js dashboard.
- `postgres`: database.
- `caddy`: reverse proxy.

Caddy routing:

- UI routes -> `web:3001`;
- `/telegram/*`, `/webhooks/*`, `/auth/*`, `/admin/*`, `/health`, `/healthz` -> `app:3000`;
- Next API routes `/api/*` остаются внутри web app и проксируют server-side запросы к backend.

Миграции применяются автоматически при старте `app` container через `prisma migrate deploy`.

Логи:

```bash
docker compose logs -f app
docker compose logs -f web
docker compose logs -f caddy
docker compose logs -f postgres
```

## GitHub Auto Deploy

Workflow `.github/workflows/deploy.yml` деплоит push в `main`.

Нужные GitHub Actions secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PASSWORD`
- `DEPLOY_PATH`

На сервере уже должен быть `.env`. Workflow загружает код и выполняет:

```bash
docker compose up -d --build
```

## Checks

API build:

```bash
npm run build --workspace @running-ai/api
```

Web typecheck:

```bash
npm run typecheck --workspace @running-ai/web
```

Web build:

```bash
npm run build:web
```

API tests:

```bash
npm test
```

Docker build:

```bash
docker compose build app web
```

## Privacy And Safety

- Не логировать secrets, tokens или full health payloads.
- Не fine-tune на health/Strava данных.
- Strava tokens хранить encrypted.
- OpenRouter использовать только для reasoning, explanation и conversational interface.
- Training decisions должны опираться на deterministic training engine outputs.
- Recovery/readiness/load score - coaching estimates, не медицинская диагностика.
- При chest pain, dizziness, fainting, unusual shortness of breath или persistent pain приложение должно советовать остановить тренировку и обратиться к медицинскому специалисту.

## Current Product Boundary

Что продукт делает:

- помогает принять ежедневное беговое решение;
- показывает минимальный набор meaningful метрик;
- строит conservative план;
- объясняет изменения плана;
- работает поверх реальных imported health данных.

Что продукт намеренно не делает:

- не является медицинским устройством;
- не диагностирует заболевания;
- не показывает unsupported Apple Watch SE 2 metrics;
- не превращается в wellness super-app;
- не подменяет тренера или врача.
