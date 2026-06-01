# BillFlow

![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python&logoColor=white&style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white&style=flat-square)
![Tests](https://img.shields.io/badge/tests-26%20passed-brightgreen?style=flat-square)
![mypy](https://img.shields.io/badge/mypy-strict-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-informational?style=flat-square)

**Multi-tenant subscription billing & usage-metering API** — a production-grade billing backend for SaaS and service businesses.

Isolate customers as tenants, issue scoped API keys, define plans with flat + metered pricing, record usage idempotently, generate invoices, and collect payments via Stripe — all behind a clean REST API.

---

## Features

| Capability | Details |
|---|---|
| **Multi-tenant isolation** | Every resource scoped by tenant; API keys carry `read`/`write`/`admin` roles |
| **Flexible plans** | Base fee + N metered components (e.g. $0.02/API call, 100 included free) |
| **Idempotent usage** | Unique `idempotency_key` per usage event; race-safe via `IntegrityError` handling |
| **Invoice generation** | Base fee + metered overage billing; exact integer-cent arithmetic |
| **Stripe payments** | `POST /billing/invoices/{id}/pay` → Stripe PaymentIntent; fake gateway in dev |
| **Webhook settlement** | HMAC-SHA256 verified; event-id dedup ensures exactly-once invoice settlement |
| **Alembic migrations** | Full migration history for production Postgres |
| **Strict quality** | mypy `--strict`, ruff, pytest 26 tests, GitHub Actions CI, Docker |

---

## Architecture

```mermaid
graph TD
    subgraph Transport
        A[FastAPI Routes]
    end
    subgraph Application
        B[BillingService]
        C[TenantService]
        D[WebhookService]
    end
    subgraph Domain
        E[Models & Schemas]
    end
    subgraph Infrastructure
        F[SQLAlchemy Repos]
        G[PaymentGateway]
        H[(SQLite / Postgres)]
    end
    subgraph Adapters
        I[StripePaymentGateway]
        J[FakePaymentGateway]
    end

    A --> B & C & D
    B & C & D --> E
    B & C & D --> F
    B --> G
    F --> H
    G -->|prod| I
    G -->|dev/test| J
```

Strict layering: `api → services → repositories → models`. The `PaymentGateway` protocol is the main seam — swap Stripe for any provider without touching business logic.

**Money is always integer cents** — no floating-point arithmetic anywhere in the billing stack.

---

## Quick Start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Run (SQLite auto-created on first boot)
uvicorn app.main:app --reload
# → Swagger UI: http://localhost:8000/docs
```

### Full billing flow

```bash
BASE=http://localhost:8000/api/v1

# 1. Create a tenant
TENANT=$(curl -s -X POST $BASE/tenants \
  -H 'content-type: application/json' \
  -d '{"name":"Acme Inc","slug":"acme"}' | jq -r .id)

# 2. Issue an admin key (raw_key shown ONCE)
KEY=$(curl -s -X POST $BASE/tenants/$TENANT/api-keys \
  -H 'content-type: application/json' -d '{"role":"admin"}' | jq -r .raw_key)

AUTH="Authorization: Bearer $KEY"

# 3. Create a plan: $10/mo base + $0.02/call over 100 free
PLAN=$(curl -s -X POST $BASE/billing/plans -H "$AUTH" \
  -H 'content-type: application/json' \
  -d '{"code":"pro","name":"Pro","interval":"month","base_price_cents":1000,
       "components":[{"metric":"api_calls","unit_price_cents":2,"included_units":100}]}' \
  | jq -r .id)

# 4. Subscribe a customer, record 150 calls, generate invoice
CUST=$(curl -s -X POST $BASE/billing/customers -H "$AUTH" \
  -H 'content-type: application/json' \
  -d '{"external_id":"cust_1","email":"alice@acme.com"}' | jq -r .id)

SUB=$(curl -s -X POST $BASE/billing/subscriptions -H "$AUTH" \
  -H 'content-type: application/json' \
  -d "{\"customer_id\":\"$CUST\",\"plan_id\":\"$PLAN\"}" | jq -r .id)

curl -s -X POST $BASE/billing/usage -H "$AUTH" \
  -H 'content-type: application/json' \
  -d "{\"subscription_id\":\"$SUB\",\"metric\":\"api_calls\",\"quantity\":150,
       \"idempotency_key\":\"run-001\"}"

INVOICE=$(curl -s -X POST $BASE/billing/subscriptions/$SUB/invoice -H "$AUTH" \
  | jq -r .id)
# → total_cents: 2000 ($10 base + 50 overage calls × $0.02)

# 5. Create Stripe PaymentIntent (uses FakeGateway without STRIPE_SECRET_KEY)
curl -s -X POST $BASE/billing/invoices/$INVOICE/pay -H "$AUTH"
```

### Docker

```bash
docker build -t billflow .
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@host/db \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  billflow
```

---

## API Reference

### Tenants

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/tenants` | — | Create tenant |
| `GET` | `/api/v1/tenants` | `read` | List all tenants |
| `POST` | `/api/v1/tenants/{id}/api-keys` | — | Issue API key |

### Billing

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/billing/plans` | `write` | Create billing plan |
| `GET` | `/api/v1/billing/plans` | `read` | List plans |
| `POST` | `/api/v1/billing/customers` | `write` | Create customer |
| `POST` | `/api/v1/billing/subscriptions` | `write` | Subscribe customer to plan |
| `POST` | `/api/v1/billing/usage` | `write` | Record usage (idempotent) |
| `POST` | `/api/v1/billing/subscriptions/{id}/invoice` | `write` | Generate invoice |
| `GET` | `/api/v1/billing/invoices/{id}` | `read` | Get invoice |
| `POST` | `/api/v1/billing/invoices/{id}/pay` | `write` | Create Stripe PaymentIntent |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/webhooks/stripe` | Stripe event receiver (HMAC verified, idempotent) |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./billflow.db` | No | Async SQLAlchemy URL |
| `STRIPE_SECRET_KEY` | `""` | No | Stripe secret key (empty → FakeGateway) |
| `STRIPE_WEBHOOK_SECRET` | `""` | No | Webhook signing secret |
| `STRIPE_API_BASE` | `https://api.stripe.com` | No | Override for testing |
| `ENVIRONMENT` | `dev` | No | `dev` / `test` / `prod` |

---

## Tests

```bash
ruff check app tests   # lint
mypy app               # strict type check
pytest -q              # 26 tests
```

| Test file | Covers |
|-----------|--------|
| `test_tenants.py` | Tenant CRUD, API key issuance, auth, role enforcement |
| `test_billing.py` | Plans, customers, subscriptions, usage idempotency, invoices |
| `test_stripe_signing.py` | HMAC sign/verify, replay, tamper, expiry |
| `test_payments_webhooks.py` | Pay endpoint, webhook settlement, event dedup, bad sig → 400 |

---

## Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Generate new migration after model changes
alembic revision --autogenerate -m "describe change"
```

---

## Roadmap

- [x] Multi-tenant isolation with scoped API keys
- [x] Plans with metered components
- [x] Idempotent usage ingestion (race-safe)
- [x] Invoice generation with overage billing
- [x] Stripe PaymentIntents + idempotent webhook settlement
- [x] Alembic migrations
- [ ] Subscription lifecycle (pause, cancel, upgrade/downgrade)
- [ ] Scheduled period rollover & auto-invoicing
- [ ] Stripe Customer objects & saved payment methods
- [ ] Portal / admin dashboard UI

---

## License

MIT
