# UniInbox

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white&style=flat-square)
![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify&logoColor=white&style=flat-square)
![Tests](https://img.shields.io/badge/tests-16%20passed-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-informational?style=flat-square)

**Omnichannel customer inbox** — unify Telegram, email and web-chat into threaded conversations with reliable CRM sync.

Built for small support and sales teams drowning in multiple chat apps. One API ingests messages from any channel, threads them by contact, and syncs contact data to your CRM with automatic retry, backoff, and a dead-letter queue.

---

## Features

| Capability | Details |
|---|---|
| **Omnichannel** | Telegram, email, webchat → single unified conversation thread per contact |
| **Idempotent ingestion** | Dedup by provider message id — replay webhooks safely, never double-count |
| **Conversation threading** | Auto-threads by `(org, channel, externalContactId)` |
| **Reliable CRM sync** | Retry + exponential backoff + dead-letter queue (→ BullMQ+Redis in prod) |
| **Zod validation** | Each channel adapter validates its payload shape at the boundary |
| **Ports & adapters** | Swap any adapter (Telegram → WhatsApp, in-memory → Postgres) without touching domain |
| **Strict TypeScript** | `tsc --strict` across the entire codebase |

---

## Architecture

```mermaid
flowchart LR
    subgraph Channels
        T[Telegram webhook]
        E[Email webhook]
        W[Webchat widget]
    end
    subgraph HTTP["Fastify HTTP"]
        R[/channels/{ch}/ingest/]
    end
    subgraph App["Application Layer"]
        IS[InboxService]
        CJ[CrmSyncJob]
    end
    subgraph Infra["Infrastructure"]
        CA[Channel Adapters + Zod]
        JQ[JobQueue retry/backoff/DLQ]
        MR[In-memory Repos → Postgres]
        FC[FakeCrmClient → real CRM]
    end

    T & E & W --> R
    R --> CA --> IS
    IS --> MR
    IS --> JQ
    JQ --> CJ --> FC
```

### Project layout

```
src/
  domain/           Channel, Direction, Status enums; Contact, Conversation, Message types
  application/
    inbox.service.ts    ingest / thread / reply
    crm-sync.ts         CRM sync job handler
    ports.ts            IRepo, ICrmClient, IChannelTransport interfaces
  infrastructure/
    in-memory.repos.ts  thread-safe stores (→ Postgres in prod)
    job-queue.ts        deterministic retry/backoff/DLQ with injected clock (→ BullMQ)
    fakes.ts            FakeCrmClient, FakeChannelTransport for tests
    channels/
      telegram.adapter.ts   Zod-validated inbound transformer
      email.adapter.ts
      webchat.adapter.ts
  http/server.ts    Fastify app factory
  composition.ts    wire adapters to ports
  main.ts           entrypoint
```

**Design decisions:**
- **Idempotency:** `ingest()` checks provider message id before writing — safe to replay any channel webhook.
- **Contact identity:** resolved by `(org, channel, externalId)`. Same person on Telegram and email becomes one contact if they match.
- **JobQueue clock injection:** the queue takes a `clock` in its constructor so tests run at deterministic timestamps without sleeping.

---

## Quick Start

```bash
npm install
npm run typecheck   # tsc --strict
npm test            # 16 tests
npm run build
npm start           # http://localhost:3000
```

### Ingest a message

```bash
# Telegram webhook simulation
curl -X POST http://localhost:3000/channels/telegram/ingest \
  -H 'content-type: application/json' \
  -d '{
    "providerMessageId": "tg_msg_001",
    "externalContactId": "user_42",
    "contactName": "Alice",
    "text": "Hello, I need help with my order",
    "receivedAt": "2025-06-01T10:00:00Z"
  }'

# List conversations
curl http://localhost:3000/conversations
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/channels/{channel}/ingest` | Ingest message (`telegram` / `email` / `webchat`) |
| `GET` | `/conversations` | List all conversations |
| `GET` | `/conversations/{id}/messages` | Get messages in a thread |
| `POST` | `/conversations/{id}/reply` | Send reply via original channel |
| `GET` | `/contacts/{id}` | Get contact profile |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | — | Postgres connection string (optional in dev) |
| `REDIS_URL` | — | Redis for BullMQ (optional — in-memory queue used if absent) |
| `CRM_API_URL` | — | CRM base URL |
| `CRM_API_KEY` | — | CRM authentication token |

---

## Tests

```bash
npm test   # 16 tests
```

| Test file | Covers |
|-----------|--------|
| `inbox.service.spec.ts` | Ingest, thread creation, idempotent replay, reply routing |
| `channels.spec.ts` | Zod validation per adapter — happy path + malformed input |
| `job-queue.spec.ts` | Retry schedule, exponential backoff, DLQ after max attempts |

---

## Docker

```bash
docker build -t uniinbox .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host/uniinbox \
  -e REDIS_URL=redis://redis:6379 \
  -e CRM_API_URL=https://crm.example.com \
  -e CRM_API_KEY=secret \
  uniinbox
```

---

## Roadmap

- [x] Omnichannel ingestion (Telegram, email, webchat)
- [x] Idempotent dedup by provider message id
- [x] Contact identity resolution
- [x] Retry/backoff/DLQ job queue (in-memory)
- [ ] BullMQ + Redis adapter wiring
- [ ] Postgres persistence adapter
- [ ] WhatsApp Business API adapter
- [ ] AI auto-reply suggestions
- [ ] Agent assignment and routing rules
- [ ] Analytics dashboard

---

## License

MIT
