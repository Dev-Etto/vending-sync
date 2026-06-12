# VendingSync

Sistema de telemetria e pagamentos para vending machines — Proof of Concept.

Demonstra um pipeline completo de eventos em tempo real: da máquina ao dashboard, passando por filas de mensagens, processamento assíncrono e WebSockets.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                    Next.js + Socket.io client                    │
│         MachineCard   TransactionFeed   LoginPage                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API (Fastify)                           │
│  /auth  /machines  /transactions  /webhooks  /health             │
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
                             │  Emite Socket.io events │
                             └─────────────────────────┘
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

## Quick Start

```bash
# 1. Clone e instale as dependências
git clone <repo-url>
cd vending-sync
pnpm install

# 2. Configure as variáveis de ambiente
cp .env.example .env

# 3. Suba a infraestrutura
docker compose up -d

# 4. Configure o banco e dados iniciais
pnpm db:migrate && pnpm db:seed

# 5. Inicie os serviços
pnpm dev:api   # Terminal A — API + worker
pnpm dev:web   # Terminal B — Frontend
```

Acesse http://localhost:3000 e faça login com `admin@vendingsync.com` / `admin123`.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev:api` | Inicia a API com hot reload |
| `pnpm dev:web` | Inicia o frontend com hot reload |
| `pnpm db:migrate` | Aplica migrations no banco |
| `pnpm db:seed` | Popula o banco com dados iniciais |
| `pnpm db:studio` | Abre o Drizzle Studio |
| `MACHINE_ID=<uuid> pnpm --filter api simulate` | Roda o simulador de vending machine |

## Referência de API

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/auth/login` | — | Autenticação, retorna JWT |
| GET | `/api/auth/me` | JWT | Dados do usuário autenticado |
| GET | `/api/machines` | JWT | Lista todas as máquinas |
| GET | `/api/machines/:id` | JWT | Detalhes de uma máquina |
| POST | `/api/machines/:id/telemetry` | — | Heartbeat da máquina física |
| GET | `/api/transactions` | JWT | Lista transações (paginado) |
| POST | `/api/webhooks/payment` | — | Recebe notificação de pagamento |
| GET | `/health` | — | Status da API e dependências |

## Eventos WebSocket

| Evento | Direção | Payload |
|--------|---------|---------|
| `new_transaction` | Server → Client | `{ transaction, machine }` |
| `machine_updated` | Server → Client | `{ machine }` |

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://postgres:postgres@localhost:5432/vendingsync` |
| `RABBITMQ_URL` | Connection string RabbitMQ | `amqp://guest:guest@localhost:5672` |
| `JWT_SECRET` | Segredo para assinar tokens JWT | — (obrigatório) |
| `JWT_EXPIRES_IN` | Validade dos tokens | `7d` |
| `PORT` | Porta da API | `3001` |
| `NODE_ENV` | Ambiente | `development` |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:3000` |

## URLs de acesso

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | admin@vendingsync.com / admin123 |
| API | http://localhost:3001 | — |
| Health check | http://localhost:3001/health | — |
| RabbitMQ UI | http://localhost:15672 | guest / guest |

## Stack técnica

- **Runtime**: Node.js 20, TypeScript, pnpm workspaces
- **API**: Fastify, Zod, Pino, Socket.io, @fastify/jwt
- **Banco**: PostgreSQL, Drizzle ORM
- **Filas**: RabbitMQ (amqplib), DLQ para mensagens com falha
- **Frontend**: Next.js 16 (App Router), React Query, Socket.io client, Tailwind CSS
- **Infra**: Docker Compose

## Simplificações conhecidas (PoC)

| Simplificação | Em produção |
|---------------|-------------|
| JWT em `localStorage` | HttpOnly cookies (previne XSS) |
| Worker no mesmo processo da API | Serviço separado com scaling independente |
| Sem rate limiting no webhook | Rate limiting + validação de assinatura HMAC |
| Sem cache | Redis para dados frequentemente lidos |
| Health check simples | Circuit breakers + métricas Prometheus |
