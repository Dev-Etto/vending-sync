# VendingSync

> Real-time telemetry and payment system for vending machines — Proof of Concept.

VendingSync demonstrates a complete event-driven pipeline: from a physical vending machine all the way to a live dashboard, passing through message queues, asynchronous payment processing, and WebSocket broadcasts.

Think of it as a **post office for machine events**: each vending machine drops a letter (telemetry/payment) into a mailbox (RabbitMQ), a postal worker (Payment Worker) sorts and processes it, and the result is immediately delivered to everyone watching the dashboard (Socket.IO).

> **Other languages:** [Português (BR)](README.pt-br.md)

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Environment Variables](#environment-variables)
- [Access URLs](#access-urls)
- [Tech Stack](#tech-stack)
- [Payment Flow](#payment-flow)
- [Live Demo Simulation](#live-demo-simulation)
- [Known Simplifications (PoC)](#known-simplifications-poc)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                    Next.js + Socket.IO client                    │
│         MachineCard   TransactionFeed   LoginPage                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (React Query) + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API (Fastify :3001)                         │
│  /auth  /machines  /transactions  /webhooks  /simulate  /health  │
│                      JWT Middleware                              │
│                  Correlation ID Middleware                        │
└──────────┬──────────────────────────────┬──────────────────────┘
           │ Drizzle ORM                  │ amqplib publish
           ▼                             ▼
┌──────────────────┐         ┌───────────────────────┐
│   PostgreSQL     │         │       RabbitMQ         │
│                  │         │  payment_processing     │
│  machines        │         │  payment_dead_letter    │
│  transactions    │         └──────────┬─────────────┘
│  users           │                    │ consume
└──────────────────┘         ┌──────────▼─────────────┐
           ▲                 │    Payment Worker       │
           │ INSERT          │  (runs inside API proc) │
           └─────────────────┤                         │
                             │  Emits Socket.IO events │
                             └─────────────────────────┘
```

The system has three main layers:

1. **API (Fastify)** — receives HTTP requests from machines and the dashboard, validates data with Zod, persists to PostgreSQL, publishes payment events to RabbitMQ, and broadcasts real-time updates via Socket.IO.
2. **Payment Worker** — runs inside the API process, consumes messages from RabbitMQ, simulates payment processing, and fires Socket.IO events when the payment status changes.
3. **Web Dashboard (Next.js)** — authenticates via JWT, fetches data with React Query, and subscribes to Socket.IO events for live updates without polling.

---

## Project Structure

```
vending-sync/
├── apps/
│   ├── api/                    # Fastify server (port 3001)
│   │   └── src/
│   │       ├── routes/         # auth, machines, transactions, webhooks, simulate, health
│   │       ├── services/       # Socket.IO, RabbitMQ, simulation logic
│   │       ├── workers/        # payment.worker — async payment processor
│   │       ├── middleware/     # auth (JWT guard), correlationId (request tracing)
│   │       ├── types/          # TypeScript augmentations for Fastify & Socket.IO
│   │       ├── env.ts          # Zod-validated environment variables
│   │       └── index.ts        # Server bootstrap
│   │
│   └── web/                    # Next.js 16 dashboard (port 3000)
│       └── src/
│           ├── app/            # App Router pages & layout
│           ├── components/     # LoginForm, MachinesGrid, MachineCard, TransactionFeed, etc.
│           ├── hooks/          # useAuth, useMachines, useTransactions, useSimulation, useSocketStatus
│           └── lib/            # API client, auth helpers, shared constants
│
├── packages/
│   └── db/                     # Shared Drizzle ORM package
│       └── src/
│           ├── schema.ts       # Table definitions (machines, transactions, users)
│           ├── migrate.ts      # Migration runner
│           └── seed.ts         # Initial data (admin user + sample machines)
│
├── docker-compose.yml          # PostgreSQL 16 + RabbitMQ 3.13
├── pnpm-workspace.yaml         # Monorepo workspace config
├── tsconfig.base.json          # Shared TypeScript base config
└── package.json                # Root scripts
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) and Docker Compose

---

## Quick Start

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd vending-sync
pnpm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 3. Start infrastructure (PostgreSQL + RabbitMQ)
docker compose up -d

# 4. Run migrations and seed initial data
pnpm db:migrate && pnpm db:seed

# 5. Start the services
pnpm dev:api   # Terminal A — API + Payment Worker
pnpm dev:web   # Terminal B — Next.js Dashboard
```

Open [http://localhost:3000](http://localhost:3000) and log in with `admin@vendingsync.com` / `admin123`.

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API and Web in parallel (hot reload) |
| `pnpm dev:api` | Start API only (hot reload via `tsx watch`) |
| `pnpm dev:web` | Start Web dashboard only |
| `pnpm typecheck` | Type-check all workspace packages |
| `pnpm lint` | Lint the web app |
| `pnpm lint:fix` | Lint and auto-fix the web app |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Drizzle migrations after schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Populate database with initial data |
| `pnpm db:studio` | Open Drizzle Studio (browser DB UI) |

### Simulation

```bash
# Simulate a vending machine sending events from the CLI
MACHINE_ID=<uuid> pnpm --filter api simulate
```

Or use the **"Live Demo"** button in the dashboard header to toggle the built-in simulation.

### Infrastructure

```bash
docker compose up -d    # Start PostgreSQL + RabbitMQ
docker compose down     # Stop infrastructure
```

---

## API Reference

All endpoints except `/health`, `/api/auth/login`, and machine telemetry require a JWT token in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Authenticate and receive a JWT |
| `GET` | `/api/auth/me` | JWT | Current authenticated user |
| `GET` | `/api/machines` | JWT | List all machines (paginated) |
| `GET` | `/api/machines/:id` | JWT | Machine details |
| `POST` | `/api/machines/:id/telemetry` | — | Machine heartbeat (from physical device) |
| `GET` | `/api/transactions` | JWT | Paginated transaction history |
| `POST` | `/api/webhooks/payment` | — | Payment processor callback |
| `GET` | `/health` | — | API, RabbitMQ, and DB status |
| `GET` | `/api/simulate` | JWT | Current simulation status |
| `POST` | `/api/simulate/toggle` | JWT | Toggle live demo simulation on/off |

---

## WebSocket Events

The Socket.IO server listens at the API base URL. All events are server → client:

| Event | Payload | Description |
|-------|---------|-------------|
| `new_transaction` | `{ transaction, machine }` | New transaction detected or payment status updated |
| `machine_updated` | `{ machine }` | Machine status or stock level changed |

---

## Environment Variables

Copy `.env.example` to `.env` and update the values before starting:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/vendingsync` | PostgreSQL connection string |
| `RABBITMQ_URL` | Yes | `amqp://guest:guest@localhost:5672` | RabbitMQ AMQP URL |
| `JWT_SECRET` | Yes | — | Token signing secret (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (`s` / `m` / `h` / `d`) |
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | Controls logging verbosity |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin for the API |

---

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | `admin@vendingsync.com` / `admin123` |
| API | http://localhost:3001 | — |
| Health check | http://localhost:3001/health | — |
| RabbitMQ UI | http://localhost:15672 | `guest` / `guest` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20, TypeScript, pnpm workspaces |
| API | Fastify, Zod (`fastify-type-provider-zod`), Pino, `@fastify/jwt`, `@fastify/cors` |
| Database | PostgreSQL 16, Drizzle ORM |
| Message Queue | RabbitMQ 3.13 (`amqplib`), Dead Letter Queue for failed messages |
| Real-time | Socket.IO (server + client) |
| Frontend | Next.js 16 (App Router), React 19, React Query, Tailwind CSS v4 |
| Infrastructure | Docker Compose |

---

## Payment Flow

Understanding how a purchase travels through the system:

```
1. Vending machine POSTs /api/machines/:id/telemetry
        ↓
2. API records a PENDING transaction in PostgreSQL
        ↓
3. API publishes a message to RabbitMQ `payment_processing` queue
        ↓
4. Payment Worker consumes the message (async, same process)
        ↓
5. Worker simulates payment gateway call
        ↓
   ┌────────────┬─────────────────┐
   │  Success   │     Failure      │
   │            │                 │
   │ UPDATE →   │ UPDATE →        │
   │ COMPLETED  │ FAILED          │
   │            │ (message goes   │
   │            │ to DLQ)         │
   └────────────┴─────────────────┘
        ↓
6. Worker emits `new_transaction` via Socket.IO
        ↓
7. Dashboard updates in real time
```

---

## Live Demo Simulation

No physical machine? Use the built-in simulator:

- **Dashboard button**: Click **"Live Demo"** in the top-right header to toggle. The API generates machine telemetry and payment events continuously.
- **CLI script**: Run `MACHINE_ID=<uuid> pnpm --filter api simulate` to send a single burst of events for a specific machine.

Both methods use the same Socket.IO channels, so the dashboard updates in real time either way.

---

## Known Simplifications (PoC)

This is a proof-of-concept. Production-ready versions would address:

| Area | Current (PoC) | Production Needs |
|------|--------------|-----------------|
| Auth token storage | `localStorage` | `httpOnly` + `Secure` cookies (prevents XSS) |
| Payment Worker | Same API process | Separate service with independent horizontal scaling |
| Webhook security | No validation | Rate limiting + HMAC signature verification |
| Caching | None | Redis for frequently read data |
| Observability | Simple `/health` endpoint | Prometheus metrics + circuit breakers + distributed tracing |
| Test coverage | None (manual only) | Unit + integration + e2e tests |
