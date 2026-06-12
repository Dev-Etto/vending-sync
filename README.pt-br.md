# VendingSync

> Sistema de telemetria e pagamentos em tempo real para vending machines — Proof of Concept.

O VendingSync demonstra um pipeline completo orientado a eventos: da máquina física até o dashboard ao vivo, passando por filas de mensagens, processamento assíncrono de pagamentos e broadcasts via WebSocket.

Pense como uma **agência dos Correios para eventos de máquina**: cada vending machine deposita uma carta (telemetria/pagamento) numa caixa de correio (RabbitMQ), um carteiro (Payment Worker) a classifica e processa, e o resultado é entregue imediatamente a todos que estão assistindo o dashboard (Socket.IO).

> **Other languages:** [English](README.md)

---

## Índice

- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Quick Start](#quick-start)
- [Scripts disponíveis](#scripts-disponíveis)
- [Referência da API](#referência-da-api)
- [Eventos WebSocket](#eventos-websocket)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [URLs de acesso](#urls-de-acesso)
- [Stack técnica](#stack-técnica)
- [Fluxo de pagamento](#fluxo-de-pagamento)
- [Simulação ao vivo](#simulação-ao-vivo)
- [Simplificações conhecidas (PoC)](#simplificações-conhecidas-poc)

---

## Arquitetura

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
           │ INSERT          │  (roda no proc da API)  │
           └─────────────────┤                         │
                             │  Emite eventos Socket.IO│
                             └─────────────────────────┘
```

O sistema tem três camadas principais:

1. **API (Fastify)** — recebe requisições HTTP das máquinas e do dashboard, valida dados com Zod, persiste no PostgreSQL, publica eventos de pagamento no RabbitMQ e faz broadcast de atualizações em tempo real via Socket.IO.
2. **Payment Worker** — roda dentro do processo da API, consome mensagens do RabbitMQ, simula o processamento do pagamento e dispara eventos Socket.IO quando o status muda.
3. **Web Dashboard (Next.js)** — autentica via JWT, busca dados com React Query e assina eventos Socket.IO para atualizações ao vivo sem polling.

---

## Estrutura do Projeto

```
vending-sync/
├── apps/
│   ├── api/                    # Servidor Fastify (porta 3001)
│   │   └── src/
│   │       ├── routes/         # auth, machines, transactions, webhooks, simulate, health
│   │       ├── services/       # Socket.IO, RabbitMQ, lógica de simulação
│   │       ├── workers/        # payment.worker — processador assíncrono de pagamentos
│   │       ├── middleware/     # auth (guarda JWT), correlationId (rastreamento de requisição)
│   │       ├── types/          # Augmentations TypeScript para Fastify e Socket.IO
│   │       ├── env.ts          # Variáveis de ambiente validadas com Zod
│   │       └── index.ts        # Bootstrap do servidor
│   │
│   └── web/                    # Dashboard Next.js 16 (porta 3000)
│       └── src/
│           ├── app/            # Páginas e layout do App Router
│           ├── components/     # LoginForm, MachinesGrid, MachineCard, TransactionFeed, etc.
│           ├── hooks/          # useAuth, useMachines, useTransactions, useSimulation, useSocketStatus
│           └── lib/            # Cliente de API, helpers de auth, constantes compartilhadas
│
├── packages/
│   └── db/                     # Pacote Drizzle ORM compartilhado
│       └── src/
│           ├── schema.ts       # Definição das tabelas (machines, transactions, users)
│           ├── migrate.ts      # Runner de migrations
│           └── seed.ts         # Dados iniciais (usuário admin + máquinas de exemplo)
│
├── docker-compose.yml          # PostgreSQL 16 + RabbitMQ 3.13
├── pnpm-workspace.yaml         # Configuração do workspace monorepo
├── tsconfig.base.json          # Config TypeScript base compartilhada
└── package.json                # Scripts raiz
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) e Docker Compose

---

## Quick Start

```bash
# 1. Clone e instale as dependências
git clone <repo-url>
cd vending-sync
pnpm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env e defina um JWT_SECRET forte

# 3. Suba a infraestrutura (PostgreSQL + RabbitMQ)
docker compose up -d

# 4. Aplique as migrations e popule dados iniciais
pnpm db:migrate && pnpm db:seed

# 5. Inicie os serviços
pnpm dev:api   # Terminal A — API + Payment Worker
pnpm dev:web   # Terminal B — Dashboard Next.js
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com `admin@vendingsync.com` / `admin123`.

---

## Scripts disponíveis

### Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia API e Web em paralelo (hot reload) |
| `pnpm dev:api` | Inicia apenas a API (hot reload via `tsx watch`) |
| `pnpm dev:web` | Inicia apenas o dashboard Web |
| `pnpm typecheck` | Type-check de todos os pacotes do workspace |
| `pnpm lint` | Lint do app web |
| `pnpm lint:fix` | Lint e correção automática do app web |

### Banco de dados

| Comando | Descrição |
|---------|-----------|
| `pnpm db:generate` | Gera migrations Drizzle após mudanças no schema |
| `pnpm db:migrate` | Aplica as migrations pendentes |
| `pnpm db:seed` | Popula o banco com dados iniciais |
| `pnpm db:studio` | Abre o Drizzle Studio (UI de banco no browser) |

### Simulação

```bash
# Simula uma vending machine enviando eventos via CLI
MACHINE_ID=<uuid> pnpm --filter api simulate
```

Ou use o botão **"Demo ao vivo"** no header do dashboard para ativar/desativar a simulação embutida.

### Infraestrutura

```bash
docker compose up -d    # Inicia PostgreSQL + RabbitMQ
docker compose down     # Para a infraestrutura
```

---

## Referência da API

Todos os endpoints exceto `/health`, `/api/auth/login` e telemetria das máquinas exigem JWT no header `Authorization: Bearer <token>`.

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `POST` | `/api/auth/login` | — | Autenticação, retorna JWT |
| `GET` | `/api/auth/me` | JWT | Usuário autenticado atual |
| `GET` | `/api/machines` | JWT | Lista todas as máquinas (paginado) |
| `GET` | `/api/machines/:id` | JWT | Detalhes de uma máquina |
| `POST` | `/api/machines/:id/telemetry` | — | Heartbeat da máquina física |
| `GET` | `/api/transactions` | JWT | Histórico de transações (paginado) |
| `POST` | `/api/webhooks/payment` | — | Callback do processador de pagamento |
| `GET` | `/health` | — | Status da API, RabbitMQ e banco |
| `GET` | `/api/simulate` | JWT | Status atual da simulação |
| `POST` | `/api/simulate/toggle` | JWT | Ativa/desativa a simulação ao vivo |

---

## Eventos WebSocket

O servidor Socket.IO escuta na URL base da API. Todos os eventos são servidor → cliente:

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `new_transaction` | `{ transaction, machine }` | Nova transação detectada ou status de pagamento atualizado |
| `machine_updated` | `{ machine }` | Status ou nível de estoque da máquina alterado |

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e atualize os valores antes de iniciar:

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `DATABASE_URL` | Sim | `postgresql://postgres:postgres@localhost:5432/vendingsync` | Connection string do PostgreSQL |
| `RABBITMQ_URL` | Sim | `amqp://guest:guest@localhost:5672` | URL AMQP do RabbitMQ |
| `JWT_SECRET` | Sim | — | Segredo para assinar tokens (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | Não | `7d` | Validade do token (`s` / `m` / `h` / `d`) |
| `PORT` | Não | `3001` | Porta do servidor da API |
| `NODE_ENV` | Não | `development` | Controla o nível de verbosidade dos logs |
| `FRONTEND_URL` | Não | `http://localhost:3000` | Origem CORS permitida pela API |

---

## URLs de acesso

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | `admin@vendingsync.com` / `admin123` |
| API | http://localhost:3001 | — |
| Health check | http://localhost:3001/health | — |
| RabbitMQ UI | http://localhost:15672 | `guest` / `guest` |

---

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20, TypeScript, pnpm workspaces |
| API | Fastify, Zod (`fastify-type-provider-zod`), Pino, `@fastify/jwt`, `@fastify/cors` |
| Banco | PostgreSQL 16, Drizzle ORM |
| Fila | RabbitMQ 3.13 (`amqplib`), Dead Letter Queue para mensagens com falha |
| Tempo real | Socket.IO (servidor + cliente) |
| Frontend | Next.js 16 (App Router), React 19, React Query, Tailwind CSS v4 |
| Infra | Docker Compose |

---

## Fluxo de pagamento

Como uma compra percorre o sistema:

```
1. Vending machine faz POST /api/machines/:id/telemetry
        ↓
2. API registra a transação como PENDING no PostgreSQL
        ↓
3. API publica mensagem na fila RabbitMQ `payment_processing`
        ↓
4. Payment Worker consome a mensagem (assíncrono, mesmo processo)
        ↓
5. Worker simula chamada ao gateway de pagamento
        ↓
   ┌────────────┬─────────────────┐
   │  Sucesso   │     Falha        │
   │            │                 │
   │ UPDATE →   │ UPDATE →        │
   │ COMPLETED  │ FAILED          │
   │            │ (mensagem vai   │
   │            │ para a DLQ)     │
   └────────────┴─────────────────┘
        ↓
6. Worker emite `new_transaction` via Socket.IO
        ↓
7. Dashboard atualiza em tempo real
```

---

## Simulação ao vivo

Não tem uma máquina física? Use o simulador embutido:

- **Botão no dashboard**: Clique em **"Demo ao vivo"** no header (canto superior direito) para ativar/desativar. A API gera eventos de telemetria e pagamento continuamente.
- **Script CLI**: Execute `MACHINE_ID=<uuid> pnpm --filter api simulate` para enviar uma rajada de eventos para uma máquina específica.

Os dois métodos usam os mesmos canais Socket.IO, então o dashboard atualiza em tempo real de qualquer forma.

---

## Simplificações conhecidas (PoC)

Este é um proof-of-concept. Uma versão pronta para produção precisaria endereçar:

| Área | Atual (PoC) | Em produção |
|------|-------------|-------------|
| Armazenamento do token | `localStorage` | Cookies `httpOnly` + `Secure` (previne XSS) |
| Payment Worker | Mesmo processo da API | Serviço separado com scaling horizontal independente |
| Segurança do webhook | Sem validação | Rate limiting + verificação de assinatura HMAC |
| Cache | Nenhum | Redis para dados frequentemente lidos |
| Observabilidade | Endpoint `/health` simples | Métricas Prometheus + circuit breakers + rastreamento distribuído |
| Cobertura de testes | Nenhuma (apenas manual) | Testes unitários + integração + e2e |
