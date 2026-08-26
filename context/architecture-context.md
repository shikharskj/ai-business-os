# AI Business OS — Architecture Context

## Stack

| Layer                            | Technology                                                          | Role                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Framework                        | **Next.js + TypeScript**                                            | Full-stack application framework, routing, server rendering, API layer, and application shell           |
| UI                               | **Tailwind CSS + shadcn/ui**                                        | Consistent, responsive, accessible business application UI                                              |
| Client State                     | **Zustand**                                                         | Local UI state and lightweight client-side state; server state remains server/API driven                |
| Forms                            | **React Hook Form + Zod**                                           | Form management, validation, and shared client/server schemas                                           |
| Authentication                   | **Clerk**                                                           | User authentication, sign-in/sign-up, sessions, identity, **Organizations as the tenant/workspace boundary**, and authentication state |
| Authentication SDK               | **`@clerk/nextjs`**                                                 | Official Clerk integration with Next.js                                                                 |
| Authentication Development Skill | **Clerk/Cursor Skill**                                              | Authoritative implementation guidance for Clerk authentication tasks inside the AI development workflow |
| Authorization                    | **Application RBAC + Policy Layer**                                 | Tenant isolation, roles, permissions, resource-level access, and action authorization                   |
| Backend                          | **Next.js Server Actions + Route Handlers**                         | Application/API boundary and orchestration                                                              |
| Architecture                     | **Modular Monolith**                                                | Keep all core business domains in one deployable application while enforcing strong module boundaries   |
| Database                         | **PostgreSQL (Neon in production; local in development)**           | Primary source of truth for business, transactional, accounting, and relational data                    |
| ORM                              | **Prisma**                                                          | Type-safe database access, migrations, and persistence mapping                                          |
| Validation                       | **Zod**                                                             | Runtime validation at API, form, integration, and AI-tool boundaries                                    |
| Accounting                       | **Domain-specific double-entry ledger**                             | Financial transaction recording, journals, ledger, and accounting invariants                            |
| Background Jobs                  | **PostgreSQL-backed job queue / worker**                            | Async processing, reminders, report generation, document processing, and scheduled tasks                |
| File Storage                     | **Cloudflare R2 (S3-compatible)**                                   | Invoices, receipts, attachments, and business documents                                                 |
| Search                           | **PostgreSQL Full-Text Search + indexed queries**                   | Global business search for MVP without introducing unnecessary infrastructure                           |
| Cache                            | **Optional Redis**                                                  | Caching, rate limiting, short-lived state, and distributed coordination when required                   |
| AI Gateway                       | **Provider-agnostic AI service layer (Gemini or OpenAI via adapter)** | Centralized model access, prompts, tool calling, usage tracking, and provider abstraction               |
| AI Tools                         | **Typed business tools**                                            | Safe interface through which AI can query or mutate business data                                       |
| AI Knowledge                     | **PostgreSQL + embeddings/vector capability when required**         | Retrieval of business documents and contextual knowledge                                                |
| Events                           | **Domain Events + Outbox Pattern**                                  | Reliable propagation of business events to async consumers                                              |
| Email                            | **Provider adapter**                                                | Transactional emails and future notification integrations                                               |
| PDF                              | **Server-side PDF generation**                                      | Invoice, quotation, and report generation                                                               |
| Observability                    | **Structured logging + OpenTelemetry-compatible tracing + metrics** | Production debugging, monitoring, and performance visibility                                            |
| Testing                          | **Vitest + React Testing Library + Playwright**                     | Unit, component, integration, and end-to-end verification                                               |
| API Contracts                    | **Typed schemas + OpenAPI where needed**                            | Stable contracts for internal/external API consumers                                                    |
| Deployment                       | **Docker + Neon PostgreSQL + cloud deployment**                     | Reproducible production deployment                                                                      |
| CI/CD                            | **GitHub Actions**                                                  | Automated validation, testing, builds, migrations, and deployment                                       |
| Configuration                    | **Environment variables + typed configuration**                     | Environment-specific configuration without hardcoding secrets                                           |

**Product direction:** Post-MVP sequencing lives in [`context/product-roadmap.md`](product-roadmap.md). Platform bet: modular monolith + transactional outbox + idempotent consumers + read projections + background jobs + observability. No microservices-first. Derived systems never become money truth.

---

# Layered OS Architecture

Post-MVP the system is understood as six layers. Upper layers consume lower layers; they never bypass the truth engine for money, tax, stock, or permissions.

```text
┌────────────────────────────────────────────┐
│ EXPERIENCE                                 │
│ Dashboard • Daily Brief • Chat • Notify    │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│ AI COMPANION                               │
│ Copilot • Operator • Context • Memory      │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│ AUTOMATION                                 │
│ Events • Policies • Workflows • Jobs       │
│ Autonomy L0–L4                             │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│ BUSINESS DOMAIN                            │
│ Sales • Purchases • Inventory • Payments   │
│ Parties • Expenses • GST-ready docs        │
│        ┌─────────────────────────┐         │
│        │ TRUTH ENGINE (owned)    │         │
│        │ Ledger • Tax • Stock    │         │
│        └─────────────────────────┘         │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│ DATA & PLATFORM                            │
│ PostgreSQL • R2 • Search • Outbox • Obs    │
│ BusinessState projections (derived)        │
└────────────────────────────────────────────┘
```

Mobile experience prioritizes brief, approve, and collect paths — not a full desktop clone on day one.

---

# System Boundaries

* `app/` — Next.js application shell, routes, layouts, Clerk authentication boundaries, pages, and user-facing application entry points.
* `modules/` — Core business domains. Each module owns its domain rules, application use cases, persistence access, validation, events, and business-facing services.
* `modules/party/` — Customers, suppliers, contacts, addresses, GSTINs, and party relationships.
* `modules/catalog/` — Products, services, SKUs, units, categories, pricing references, HSN/SAC, and product configuration.
* `modules/sales/` — Quotations, optional sales orders, sales invoices, credit notes, invoice lines, discounts, taxes, sales lifecycle, and customer receivables.
* `modules/purchases/` — Purchase transactions, supplier invoices, purchase lines, supplier payables, and purchase lifecycle.
* `modules/inventory/` — Stock balances, stock movements, adjustments, low-stock detection, and inventory invariants.
* `modules/expenses/` — Business expenses, categories, taxes, attachments, and expense reporting.
* `modules/payments/` — Customer receipts, supplier payments, payment allocation, payment status, and outstanding balances.
* `modules/accounting/` — Chart of accounts, journals, journal lines, ledger, posting rules, accounting periods, and financial invariants.
* `modules/tax/` — GST configuration, HSN/SAC, CGST, SGST, IGST, input/output tax records, and GST-oriented reporting.
* `modules/reporting/` — Business dashboards, financial summaries, operational reports, and report queries.
* `modules/documents/` — Document metadata, attachments, upload authorization, storage integration, and document lifecycle.
* `modules/notifications/` — In-app notifications, email notifications, templates, delivery tracking, and notification preferences.
* `modules/search/` — Global search indexes, search queries, filtering, ranking, and searchable business entities.
* `modules/ai/` — AI assistant, AI gateway, prompts, context assembly, retrieval, AI tools, action execution, and AI audit records.
* `modules/audit/` — Append-oriented audit records for important user, system, configuration, and AI actions.
* `modules/workflows/` — Reusable approval, confirmation, status-transition, and business workflow primitives.
* `modules/tenant/` — Business/workspace lifecycle, tenant configuration, financial year, business settings, and tenant-level policies.
* `modules/users/` — Application user profiles, roles, permissions, memberships, and organization relationships.
* `modules/events/` — Typed domain-event catalog, consumer registration, and projection/automation wiring. **Persistence primitive:** transactional outbox rows (today in shared-kernel / Prisma outbox). Promote catalog and consumers under `modules/` without changing “emit in same DB transaction as mutation.”
* `modules/integrations/` — External provider adapters such as email, storage, payment, tax, and future third-party integrations.
* BusinessState / attention projections — derived read models (tables or rebuildable views) updated by idempotent outbox consumers; never the source of transactional truth.
* `lib/` — Cross-cutting technical infrastructure that is not owned by a particular business domain.
* `lib/db/` — Prisma client, database configuration, transaction helpers, and persistence infrastructure.
* `lib/auth/` — Clerk integration, authentication helpers, identity resolution, session access, and application identity mapping.
* `lib/security/` — Security utilities, authorization helpers, secret handling, sanitization, and security policies.
* `lib/observability/` — Logging, metrics, tracing, request correlation, and error reporting.
* `lib/ai/` — Low-level AI provider infrastructure and model adapters; business-specific AI behavior belongs in `modules/ai/`.
* `lib/storage/` — Object-storage abstraction and file-management infrastructure.
* `lib/queue/` — Background-job infrastructure, scheduling, retries, dead-letter handling, and workers.
* `components/` — Reusable UI components that are not owned by a specific business domain.
* `components/ui/` — Generic design-system primitives such as buttons, dialogs, inputs, tables, cards, dropdowns, and form controls.
* `components/business/` — Shared business UI components such as invoice tables, money displays, status badges, GST breakdowns, and party selectors.
* `prisma/` — Database schema, migrations, seed data, and database-specific configuration.
* `workers/` — Long-running/background processes for jobs that should not execute inside normal HTTP requests.
* `tests/` — Unit, integration, contract, security, and end-to-end tests.
* `docs/` — Architecture decisions, business rules, development documentation, runbooks, and operational documentation.

---

# Module Structure

Every business module should follow a predictable structure:

```text
modules/
└── sales/
    ├── domain/
    │   ├── entities/
    │   ├── value-objects/
    │   ├── rules/
    │   └── events/
    │
    ├── application/
    │   ├── commands/
    │   ├── queries/
    │   └── services/
    │
    ├── infrastructure/
    │   ├── repositories/
    │   └── mappers/
    │
    ├── schemas/
    └── index.ts
```

The same pattern should be applied to other major domains.

## Dependency Direction

```text
UI
 ↓
Application
 ↓
Domain
 ↑
Infrastructure
```

More precisely:

```text
Presentation
     ↓
Application Use Cases
     ↓
Domain Rules
     ↑
Infrastructure Adapters
```

Domain logic must not depend directly on:

* Next.js
* React
* Clerk
* Prisma
* PostgreSQL
* AI providers
* S3
* Email providers
* Redis

Authentication and infrastructure concerns must remain outside the domain layer.

---

# Business Domain Boundaries

The MVP should treat the following as distinct domains:

```text
Tenant
   │
   ├── Users & Access
   │
   ├── Party
   │      ├── Customers
   │      └── Suppliers
   │
   ├── Catalog
   │      ├── Products
   │      ├── Services
   │      ├── Units
   │      └── Tax Classification
   │
   ├── Sales
   │      ├── Quotations
   │      ├── Sales Orders (optional; confirm intent; stock still posts on invoice)
   │      └── Sales Invoices
   │
   ├── Purchases
   │
   ├── Inventory
   │
   ├── Expenses
   │
   ├── Payments
   │
   ├── Accounting
   │
   ├── Tax / GST
   │
   ├── Reporting
   │
   ├── Documents
   │
   ├── Notifications
   │
   └── AI
```

A domain may call another domain through an application-level interface/use case, but should not directly manipulate another domain's database tables.

---

# Authentication Architecture

## Clerk as the Authentication Authority

**Clerk is the sole authentication provider for the application.**

The application must use:

```text
@clerk/nextjs
```

for Clerk/Next.js integration.

The application must not implement an alternative authentication system.

Do not introduce:

* Auth.js
* Better Auth
* NextAuth
* Supabase Auth
* Firebase Auth
* Custom password authentication
* Custom session management
* Custom authentication cookies
* Custom JWT authentication

unless explicitly approved as a future architectural change.

Clerk owns:

* Sign-up
* Sign-in
* Sign-out
* Session management
* Authentication state
* User identity
* Authentication-related user management

The application owns:

* Application user profile
* Business/workspace membership
* Roles
* Permissions
* Business ownership
* Domain authorization
* Business data

---

# Clerk Identity Model

The relationship between authentication identity and application identity is:

```text
Clerk User
     │
     │ clerkUserId
     ▼
Application User
     │
     │ Clerk Organization + membership
     ▼
Business / Tenant  (clerkOrganizationId)
     │
     ▼
Business Resources
```

The application database must maintain an explicit mapping between the Clerk user and the application user.

Example conceptual model:

```text
User
├── id
├── clerkUserId       ← unique
├── createdAt
└── updatedAt
```

`clerkUserId` is the authoritative external identity reference.

Email address must **not** be used as the primary identity relationship between Clerk and the application database because email addresses may change.

---

# Clerk Authentication Boundary

Authentication is resolved at the application boundary.

```text
Request
   ↓
Clerk
   ↓
Authenticated Clerk User
   ↓
Application User
   ↓
Tenant Membership
   ↓
Authorization
   ↓
Application Use Case
   ↓
Domain
```

The client must never be considered the authoritative authentication or authorization boundary.

---

# Clerk Development Skill

Authentication-related implementation must follow the project's approved **Clerk/Cursor skill**.

Whenever development involves:

* Sign-in
* Sign-up
* Sign-out
* Sessions
* Authentication state
* Protected routes
* Clerk middleware/proxy
* User identity
* User management
* Clerk configuration
* Authentication webhooks
* Authentication redirects
* Clerk SDK integration
* Authentication-related security

the AI developer must consult and follow the configured Clerk/Cursor skill and the official Clerk integration patterns appropriate for the installed versions of Next.js and `@clerk/nextjs`.

The AI must not invent authentication behavior from memory when the project skill or official Clerk APIs provide the required implementation.

---

# Authentication vs Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
What may this user do?
```

Clerk is responsible for the first.

The application policy layer is responsible for the second.

```text
Clerk
 ↓
Identity
 ↓
Application User
 ↓
Tenant Membership
 ↓
Role
 ↓
Permission
 ↓
Resource Authorization
```

A valid Clerk session does **not** automatically grant access to business resources.

---

# Tenant and Membership Model

Every business is a tenant/workspace.

A user must have an explicit membership in a tenant before accessing its resources.

Conceptually:

```text
User
  │
  ├── Membership → Business A
  │
  └── Membership → Business B
```

Each membership contains:

```text
userId
tenantId
role
status
createdAt
```

Every tenant-scoped resource must either contain or resolve to:

```text
tenantId
```

Tenant identity must be resolved from trusted authenticated server context.

The application must never trust an arbitrary client-provided `tenantId` as proof of ownership.

**Clerk Organizations** are the tenant/workspace identity boundary. Each application Business stores a unique `clerkOrganizationId`. Clerk owns organization membership at the identity layer; the application Business remains the owner of GSTIN, financial year, and all business data. Multi-user membership is in scope from foundation — do not implement owner-only tenancy.

Never trust a client-supplied Clerk `orgId` as the sole authorization check. Resolve Organization → Business → Membership on the server.

---

# Authorization Model

The MVP should support:

```text
OWNER
ADMIN
STAFF
ACCOUNTANT
```

`OWNER` is only for the business creator (`Business.ownerUserId` / invitation creator). Clerk `org:admin` maps to `ADMIN`, not `OWNER`. Invited roles are carried on invitation `publicMetadata.appMembershipRole`. On membership create/update, the app prefers membership metadata; if empty, it looks up the matching Clerk organization invitation by invitee email and applies that metadata. Roles are always recomputed (never sticky forever). OWNER from invitation metadata is ignored.

Roles are a convenience layer.

Internally, authorization should be capability/permission based.

Example:

```text
invoice:create
invoice:read
invoice:update
invoice:cancel

payment:create
payment:read

expense:create
expense:read

inventory:adjust

report:read

accounting:post
```

Authorization must occur on the server.

The frontend may hide unavailable actions for UX, but this does not replace backend authorization.

---

# Authentication Webhooks and Synchronization

Clerk is the source of truth for authentication identity.

Where application data needs to stay synchronized with Clerk-managed user lifecycle events, use Clerk's supported webhook/event mechanisms.

Relevant lifecycle events may include:

```text
user.created
user.updated
user.deleted
```

Webhook processing must:

1. Validate webhook authenticity.
2. Parse and validate the event.
3. Resolve the corresponding application user.
4. Apply the required synchronization.
5. Be idempotent.
6. Record failures appropriately.
7. Never expose webhook secrets.

A Clerk webhook must never directly mutate arbitrary business data.

---

# AI Identity Propagation

AI operates under the identity of the authenticated user.

The AI execution chain is:

```text
Clerk User
    ↓
Application User
    ↓
Tenant Membership
    ↓
Permission Context
    ↓
AI Assistant
    ↓
AI Tool
    ↓
Application Use Case
    ↓
Domain Rules
    ↓
Database
```

AI tools must receive trusted execution context from the server.

The model must never be allowed to provide its own:

```text
userId
tenantId
role
permissions
```

as authoritative security context.

For example, this is forbidden:

```text
AI:
{
  userId: "abc",
  tenantId: "xyz"
}
```

being trusted directly.

Instead:

```text
Authenticated Request
        ↓
Server resolves user
        ↓
Server resolves tenant
        ↓
Server resolves permissions
        ↓
AI Tool executes under that context
```

---

# Storage Model

* **PostgreSQL**: Primary source of truth for users, tenant memberships, tenants, customers, suppliers, products, invoices, purchases, expenses, payments, inventory movements, accounting journals, tax records, workflows, notifications, audit metadata, and AI action records.
* **PostgreSQL Transactions**: Used for operations requiring atomic business consistency, particularly invoice posting, payment allocation, inventory changes, and accounting posting.
* **PostgreSQL Full-Text Search**: Used initially for global search. A dedicated search engine is not required for the MVP.
* **PostgreSQL Vector/Embedding Storage**: Used only where AI document retrieval requires semantic search. This should remain optional until the core AI workflows require it.
* **Object Storage**: Stores uploaded invoices, receipts, documents, attachments, generated PDFs, and other binary artifacts.
* **Redis — Optional**: Used only when caching, rate limiting, distributed coordination, or high-frequency ephemeral state justifies introducing it.
* **Outbox Table**: Stores domain events created in the same transaction as the business mutation.
* **Job Tables / Queue Storage**: Stores asynchronous jobs, retry state, execution metadata, and failed/dead-letter jobs.

## Source of Truth

```text
PostgreSQL
    ↓
Business Truth
```

Derived systems must never become authoritative for financial or transactional data.

For example:

```text
Invoice
   ↓
PostgreSQL = Truth
   ↓
Search Index = Derived
   ↓
Analytics = Derived
   ↓
AI Context = Derived
```

---

# Transaction Model

Critical mutations must execute inside explicit database transactions.

Example:

```text
Create Sales Invoice
        │
        ├── Validate customer
        ├── Validate products
        ├── Calculate prices
        ├── Calculate GST
        ├── Create invoice
        ├── Create invoice lines
        ├── Update inventory
        ├── Create accounting entries
        ├── Create audit record
        └── Create outbox event
```

These operations must either:

```text
ALL SUCCEED
```

or:

```text
ALL ROLLBACK
```

when they belong to the same atomic business transaction.

---

# Event Model

The product uses domain events **without** a distributed microservice architecture. Outbox remains the persistence primitive; typed catalogs and consumers expand under `modules/`.

Example catalog (extend as Post-MVP progresses):

```text
SalesInvoiceCreated
SalesInvoicePosted
CreditNoteCreated
CreditNotePosted
CreditNoteCancelled
InvoiceOverdue
PaymentReceived
AdvanceApplied
PurchaseCreated
PurchasePosted
PurchaseReturnCreated
PurchaseReturnPosted
PurchaseReturnCancelled
InventoryAdjusted
StockLow
ExpenseRecorded
JournalPosted
QuotationCreated
QuotationAccepted
QuotationIdle
CustomerCreated
SupplierCreated
DocumentUploaded
AIActionExecuted
AttentionDismissed
AutomationOutcomeRecorded
```

Events are persisted using the Outbox Pattern:

```text
Business Transaction
       │
       ├── Domain Mutation
       └── Outbox Event
                │
                ▼
          Event Processor
                │
        ┌───────┼────────┬──────────┬────────────┐
        ▼       ▼        ▼          ▼            ▼
      Search  Notify  Projections  Automation  (Reports rebuild)
```

Event consumers must be idempotent (natural keys / processed-event ids). Payloads stay small; consumers load domain data by id when needed.

---

# Business Intelligence Spine

Post-MVP R1 introduces a **living** understanding of the business — not another report warehouse.

## BusinessState projections (derived)

Examples:

```text
CashPosition
ReceivablesRisk
PayablesPressure
InventoryRisk
SalesMomentum
AttentionQueue
```

Rules:

* Projections are **derived** and must be rebuildable from ledgers and source documents.
* Projection writers never invent money; they aggregate domain truth.
* Refresh path: mutation + outbox in one transaction → async consumer applies projection upsert.
* Prisma `commitSnapshots` is one transaction. Family upserts use `updateMany` (only when stored `computedAt` is older) then `createMany` with `skipDuplicates`. Do not catch unique violations inside that transaction — PostgreSQL aborts it and later families cannot commit.
* Dashboard, Daily Brief, and AI context assembly prefer BusinessState APIs over ad-hoc multi-table scans in the chat route.
* Chat/tools still return schema-validated **facts** from domain services; projections speed attention and context, they do not replace the truth engine.

## Cash model

Cash position is defined from **ledger cash and bank account balances**. Designated COA accounts:

```text
1000  Cash   (ASSET, debit-normal)
1010  Bank   (ASSET, debit-normal)
```

Payment methods map into those accounts on posting (do not redesign journals):

```text
CASH                         → 1000 Cash
UPI, BANK_TRANSFER, CARD, CHEQUE → 1010 Bank
```

Customer receipts debit cash/bank; supplier payments and expenses credit cash/bank. Sales invoices and purchase bills do **not** move cash. An unallocated receipt (advance / retainer) uses the same cash journal; applying that credit to invoices later does **not** post cash again (`AdvanceApplied` refreshes receivables, not cash).

**Read path (the only cash path for AI/tools):**

```text
GET /api/business-state/cash     report:read   live ledger query (currency, scale, fact ids)
GET /api/business-state          report:read   includes CashPosition projection
get_cash_position tool           report:read   same getCashPosition query
```

AI must not invent cash from invoice tables, unpaid totals, or receipts-in-period. `get_business_metrics.receiptsInPeriod` is period movement, not cash on hand.

Rebuild/backfill: `rebuildBusinessStateProjections` (family `cashPosition`) recomputes from journals. Outbox events `PaymentReceived`, `PaymentMade`, `ExpenseRecorded`, `JournalPosted`, `JournalReversed` refresh the projection.

## AttentionQueue

Tenant-scoped derived queue of what needs attention. Rows are rebuildable from overdue invoices, low-stock products, idle SENT/ACCEPTED quotations, and unusual expenses (same-category amount vs recent average). Dismiss records an outcome and emits `AttentionDismissed`; it must not mutate invoices or stock.

```text
GET  /api/business-state/attention          report:read   open items, ranked by severity
POST /api/business-state/attention/dismiss  report:read   idempotent dismiss + outcome
GET  /api/business-state                    report:read   includes attention.openCount
```

Populate path: mutation + outbox → `business-state` consumer (family `attentionQueue`) and the scheduled overdue scan already used for notifications. Outcome stubs: `ATTENTION_DISMISSED`, `REMINDER_PROPOSED`, `REMINDER_SENT`, `PAID_AFTER_REMINDER`, `QUOTATION_FOLLOW_UP_PROPOSED`, `REORDER_PREPARED`, `EXPENSE_ANOMALY_FLAGGED` (`AutomationOutcomeRecorded`).

First `/app` visit backfills the queue when BusinessState `meta.rebuiltAt` is null or older than 6 hours (`ensureAttentionQueueFresh` → family `attentionQueue`, stamps `rebuiltAt`). Changing the business low-stock threshold rebuilds `attentionQueue` + `inventoryRisk` from the settings action (composition root — not inside `modules/tenant`). After that, day-to-day freshness stays on outbox + overdue scan.

Daily Brief (home `/app`, specs `05`–`06`, expansions in `11`): ranked Needs attention list from this queue plus yesterday sales / cash-in / expenses from `getPeriodActivity` (same basis as dashboard KPIs). Header shows open-type counts from visible rows; period notes (expense ratio / negative profit / payables-heavy) are L0 inform from supervisor overview facts — not a second Alerts rail. Each row carries deterministic L0–L2 labels; overdue rows can L2 Prepare reminder only when the member has `invoice:update`, via `POST /api/assistant/actions/propose` then confirm with `POST /api/assistant/actions/confirm` (same HMAC token gate as chat). Low-stock rows can L2 Prepare purchase (navigate to new bill) when the member has `purchase:create` — it does not post. A failed confirm keeps Try again / Cancel on the pending card and View / Dismiss on the row. Dismiss calls `POST /api/business-state/attention/dismiss`. The surface is deterministic when the AI supervisor is down (quieter header, same rows + notes). It is not a second chatbot. Supervisor mapper still emits an `insights` region id for schema compatibility but leaves it empty — Needs attention owns notes and queue (do not restore Alerts).

---

# Automation Runtime

Pattern:

```text
EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME
```

* Jobs execute off the request path (queue/worker).
* Every mutating action goes through existing domain use cases + authz + audit.
* Idempotency keys required for sends and posts.
* First vertical: **collections** (overdue → prioritize → draft reminder → L3 confirm or L4 policy send). Implemented as `collections.remind` (spec `10`): in-app only; share channel is spec `15`.
* Expansions (spec `11`): `quotations.followup` (idle SENT/ACCEPTED → attention + L1/L2 in-app draft, no email), `inventory.reorder` (StockLow → L1 recommend / L2 draft purchase inputs, **never** auto-post), `expenses.anomaly` (amount vs recent category average → attention + inform/recommend, no recategorize/post).
* Record outcomes (sent, paid, dismissed, failed, follow-up proposed, reorder prepared, expense flagged) so learning has a place to land.

Workflow primitives may live in `modules/workflows/` / automation boundaries; they must not post journals or stock directly.

## Implemented Path (spec `09`)

```text
outbox event
    ↓
automation consumer          enqueue WorkflowRun (idempotent tenantId+key)
    ↓
processDueWorkflowRuns       claim PENDING/RETRY (tenant concurrency key)
    ↓
EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME
    ↓
evaluateL4Autonomy           required before mode=execute (L4 only)
    ↓
domain use case              never journals/stock from the runner
    ↓
AutomationOutcome            SUCCEEDED / FAILED / SKIPPED
```

```text
modules/workflows/           definitions, runner, job rows, metrics stubs
workflow_runs                PostgreSQL job table (retries / backoff / dead-letter)
collections.remind           first vertical (spec 10): overdue → draft → L3/L4 send
quotations.followup          idle quote attention + in-app follow-up draft (no email)
inventory.reorder            low stock → prepare purchase inputs (never posts)
expenses.anomaly             unusual expense → attention inform/recommend
proof.noop                   dry-run on AttentionDismissed (no money mutation)
registerWorkflow             plugin point for later verticals
```

Default worker pass (`runOutboxProcessing` / `/api/internal/outbox/process`) fans out consumers, runs the overdue scan (notifications + AttentionQueue rebuild + `InvoiceOverdue` / `QuotationIdle` / `StockLow` catalog events), then processes due runs. The outbox process route is a public API prefix (no Clerk session); authorize with `Authorization: Bearer ${CRON_SECRET}` only (fail-closed in production when the secret is unset). Collections uses existing `send_payment_reminders` (in-app): L4 send when tenant policy allows; otherwise it prepares for Confirm on Needs attention and does not record `REMINDER_PROPOSED` until the reminder is sent or confirmed. Daily idempotency keys plus a 7-day `REMINDER_SENT` cooldown prevent reminder spam. Expansion workflows are prepare/inform only (`mode: "dry_run"`): they never post purchases or expenses, and L4 money-post classes stay absent from autonomy policy. Chat/HMAC L3 is unchanged. Settings → Recent automations lists recent runs. `GET /api/business-state/outcomes` lists reminder learning outcomes (`report:read`).

---

# Frozen vs Extend-Only (Post-MVP)

**Do not redesign** for Intelligence Spine / Operator / Automation work:

* Invoice / purchase / payment / expense posting pipelines
* Tax engine ownership of GST calculation
* Money and quantity primitives
* Tenant isolation and permission model

**Extend via:** outbox events, projections, tools, confirmation/automation policies, new read models. Credit notes and purchase returns reuse those posting pipelines (journal + stock + GST storage); they do not rewrite them.

---

# API and Application Model

The application should expose business operations through use cases rather than allowing UI components to directly manipulate database records.

Example:

```text
UI
 ↓
CreateInvoice
 ↓
Sales Application Service
 ↓
Sales Domain Rules
 ↓
Accounting / Inventory
 ↓
Transaction
 ↓
Database
```

Avoid:

```text
UI
 ↓
Prisma.create()
```

Business logic belongs in application/domain layers.

---

# Command and Query Separation

## Commands

Commands change state.

Examples:

```text
CreateCustomer
CreateProduct
CreateQuotation
CreateInvoice
CreateCreditNote
RecordPayment
ApplyCustomerAdvance
CreatePurchase
CreatePurchaseReturn
RecordExpense
AdjustInventory
PostJournal
```

Commands must enforce:

* Authentication
* Tenant resolution
* Authorization
* Validation
* Domain rules
* Transaction requirements
* Audit requirements
* Event requirements

## Queries

Queries retrieve state.

Examples:

```text
GetCustomer
GetInvoice
GetOutstandingReceivables
GetStock
GetSalesSummary
GetProfitSummary
SearchBusinessRecords
```

Queries must still enforce authentication, tenant isolation, and authorization.

Queries may use optimized read models when necessary.

---

# Accounting Model

Accounting is a first-class domain rather than a reporting calculation.

```text
Business Transaction
       ↓
Posting Rules
       ↓
Journal
       ↓
Journal Lines
       ↓
General Ledger
```

Journals are unique per `(tenantId, sourceType, sourceId)`. Concurrent posts rely on document `FOR UPDATE` + `mark*Posted(expectedStatus: DRAFT)` and map journal unique violations to already-posted domain errors.

The primary accounting invariant is:

```text
Total Debits = Total Credits
```

Financial records should be corrected through:

```text
Reversal
Adjustment
Credit Note
Debit Note
Compensating Entry
```

rather than destructive mutation.

---

# Inventory Model

Inventory is movement-based.

```text
Purchase
   ↓
Stock Increase

Sale
   ↓
Stock Decrease

Adjustment
   ↓
Stock Correction

Return
   ↓
Compensating Movement
```

Current stock is derived from controlled inventory movements.

The system must not allow arbitrary direct mutation of stock balances outside authorized inventory operations.

---

# GST Model

GST calculations belong to the tax/business domain.

The system should consider:

```text
Business GSTIN
Customer/Supplier GSTIN
Place of Supply
Transaction Type
HSN/SAC
Taxable Amount
Tax Rate
CGST
SGST
IGST
```

GST calculations should be deterministic and testable.

Posted invoices and bills stay immutable. Sales corrections use credit notes against a posted invoice (tax engine, `transactionType: "SALE"`; GST summary rows `SALES_CREDIT_NOTE` as negated output). Purchase corrections use purchase returns against a posted bill (`transactionType: "PURCHASE"`; rows `PURCHASE_RETURN` as negated input). Quantity on a credit note or return cannot exceed remaining original-line quantity. Outstanding AR/AP is `grandTotal − payments − posted credits/returns`, clamped at zero. Optional sales orders confirm commercial intent between quotation and invoice; inventory and accounting still post only when the sales invoice is posted.

The AI layer may explain GST information but must not invent tax calculations.

---

# AI Access Model

AI does not receive unrestricted database access.

Instead:

```text
User
 ↓
AI Assistant
 ↓
AI Orchestrator
 ↓
Authorized Tool
 ↓
Application Use Case
 ↓
Domain Rules
 ↓
Database
```

Example:

```text
User:
"Send a reminder to customers who have overdue invoices."

AI
 ↓
FindOverdueInvoices()
 ↓
GenerateReminder()
 ↓
Policy Check
 ↓
Request Approval / Execute
 ↓
SendNotification()
 ↓
Audit
```

The AI must never:

```text
AI
 ↓
Raw SQL
 ↓
Database
```

## Implemented Path (specs `27`, `28`, `07`)

```text
app/api/assistant/chat                     AI SDK streamText transport (Gemini via @ai-sdk/google)
modules/ai/application/assemble-assistant-context.ts
                                           identity + BusinessState/Attention summary
lib/ai/model.ts                            language model + stub-mode resolution
lib/ai/assistant-sdk-tools.ts              SDK tool() wrappers → runAiToolCall / pending actions
modules/ai/application/tools/registry.ts   the tool registry
modules/ai/application/execute-tool.ts     the single execution gate
modules/ai/application/confirm-action.ts   confirmed mutation execution (spec 28)
modules/ai/infrastructure/tool-context.ts  trusted tenant + repository wiring
app/api/assistant/actions/confirm          run a confirmed action
components/shell/assistant-launcher.tsx    top-bar sheet (only UI entry point)
```

`executeAiTool` is the only way to run a tool. In order it rejects model-supplied identity fields, requires an authenticated user and a tenant resolved on the server, checks the tool's declared permission against the membership role, refuses a confirmation-required tool that has not been confirmed (unless a trusted caller sets `autonomyAttempt: "L4"` and tenant policy allows the action class under threshold), validates input with Zod, runs the tool, validates output with Zod, and audits the outcome as `ai.tool.invoked` on the `ai_tool` resource.

Tools receive repositories through `AiToolContext`; they never import the Prisma client. The model never sees a tenant id, user id, role, or permission as an input field.

The AI SDK is confined to `app/api/assistant/chat`, `lib/ai/model.ts`, `lib/ai/assistant-sdk-tools.ts`, and the client `useChat` hook. `modules/ai/domain` and tool implementations must not import `ai` or `@ai-sdk/*`. Hand-rolled `complete()` provider adapters are not used.

The chat route imports no Prisma client and no business repository: BusinessState summaries are assembled through application APIs on the tool context, and every verified figure it returns came from a registered tool. Provider and configuration failures are converted by `describeAssistantFailure` into an assistant error state and never propagate into shell or page rendering (invariant 33).

## Facts and Recommendations

Business facts shown by the assistant are produced only by `factsFromToolResult`, from schema-validated tool output, and each one carries the tool that produced it. Streaming chat emits those facts as typed data parts alongside model text. Model prose has no path into the facts band. The assistant UI labels **Verified** (facts), **Analysis** (model prose), and **Recommend** (RECOMMENDATION lines / prepare chips) so they stay distinct.

## Confirmation Gate

```text
Model proposes an action
      ↓
Loop validates arguments, refuses to execute, returns a preview
      ↓
UI renders the preview as a decision, not a chat reply
      ↓
User confirms → signed token (tenant, user, tool, arguments, expiry)
      ↓
Confirm route re-resolves tenant and user, verifies the token
      ↓
executeAiTool re-checks identity, permission, and schema
      ↓
Use case runs → audit
```

Confirmation supplies consent only. It skips no authorization, validation, or tenant check. The token exists so a confirmation can execute only the action that was previewed; it is not the authorization boundary.

---

# AI Tool Categories

## Read Tools

Examples:

```text
get_customer()
get_invoice()
get_outstanding_receivables()
get_sales_summary()
get_purchase_summary()
get_inventory_status()
get_expense_summary()
get_gst_summary()
```

Registered read tools (spec `27`, cash in spec `03`):

```text
get_sales_summary            report:read
get_expenses_summary        report:read
get_outstanding_receivables report:read
get_overdue_invoices        invoice:read
get_low_stock_products      product:read
get_business_metrics        report:read
get_cash_position           report:read   ledger cash/bank only
explain_period_movement     report:read   current vs previous period deltas
```

## Action Tools

Examples:

```text
create_customer()
create_invoice()
record_payment()
create_expense()
create_quotation()
generate_payment_reminder()
```

Registered action tools (spec `28`):

```text
send_payment_reminders      invoice:update      L3 confirm; L4 only if policy enables + under threshold
```

Every action tool must:

1. Validate input.
2. Resolve tenant context.
3. Check authorization.
4. Execute domain rules.
5. Use the appropriate transaction.
6. Record the action.
7. Return a structured result.

An action tool must also declare `requiresConfirmation: true` and have a preview in `previewAiAction`. The assistant refuses to propose an action it cannot preview, so the user is never asked to approve something unexplained.

---

# AI Autonomy Model

Bounded autonomy (product safety):

```text
L0 — Inform / Answer
L1 — Recommend
L2 — Prepare / Draft
L3 — Execute after confirmation
L4 — Execute within explicitly configured low-risk policy
```

**L5 unrestricted financial operations are forbidden.**

## Tenant autonomy policy

Store per-tenant policy (even if UI is simple initially):

```text
allowedActionClasses
amountThresholds (e.g. auto-reminder max)
requireConfirmationAbove
disabledAutomations
```

L4 only runs when policy explicitly enables the action class and thresholds match. L3 keeps the existing HMAC confirm-token path.

Examples:

```text
Explain sales → L0
Suggest customers to follow up → L1
Draft payment reminder → L2
Send reminder after confirm → L3
Send low-risk reminder under threshold → L4
Create / post invoice → L3 (never silent L4 for posting in early Post-MVP)
Approve large payment → Human approval required
```

## Implemented Path (spec `08`)

```text
tenant_autonomy_policies          1:1 Business; missing row = L4 off
getAutonomyPolicy / updateAutonomyPolicy
                                  OWNER/ADMIN via settings:update; changes audited
evaluateL4Autonomy                fail-closed: class + threshold + not disabled
executeAiTool                     L4 only when autonomyAttempt is "L4"
runConfirmedAiAction              still HMAC L3; does not set autonomyAttempt
send_payment_reminders            declared L3 + actionClass payment_reminder
```

Settings → Autonomy edits reminder L4 enablement and amount ceilings. Chat still proposes Confirm. Invoice, purchase, and expense posting are not allowed L4 classes.

---

# AI Context Assembly

Prefer this order when building model context:

```text
1. Trusted execution identity (tenant, user, permissions)
2. BusinessState / AttentionQueue summaries (derived)
3. Typed tool results (schema-validated facts)
4. Minimal conversation text (sanitized)
```

Avoid dumping raw multi-table query results into the prompt. Facts shown to users remain tool/domain-built, never model prose.

## Implemented Path (spec `07`)

```text
AI_SYSTEM_POLICY (trusted)
    ↓
Execution identity note (no tenant/user/role identifiers)
    ↓
Fenced BusinessState / Attention summary (derived, untrusted; counts/titles only)
    ↓
Typed tool results (schema-validated, fenced)
    ↓
Sanitized user/assistant conversation
```

`assembleAssistantContext` loads projections and open attention through BusinessState APIs on the trusted tool context (`report:read`). It omits projection money so the model cannot treat derived cash/AR as ledger truth. Diagnostic “why” answers use `explain_period_movement` (application-computed deltas). Suggested prepare actions reuse the signed `send_payment_reminders` confirm path.

---

# File and Document Model

```text
Business Record
      │
      └── Document Metadata
                │
                ▼
          Object Storage
```

Database stores:

```text
documentId
tenantId
filename
contentType
size
storageKey
uploadedBy
createdAt
entityType
entityId
```

Object storage stores the actual binary content.

Files must be authorized before retrieval.

Uploaded files should be treated as untrusted input, especially when exposed to AI.

---

# Search Model

The MVP uses PostgreSQL search first.

Searchable entities:

```text
Customers
Suppliers
Products
Invoices
Quotations
Purchases
Expenses
Payments
Documents
```

Search results must always respect:

```text
tenant
permissions
resource visibility
```

Search is derived infrastructure and must be rebuildable from transactional data.

---

# Background Processing

Long-running or non-critical work must not block normal HTTP requests.

Examples:

```text
PDF generation
Email / WhatsApp delivery (when enabled)
Notification delivery
Search indexing
Document processing / OCR prepare
AI-heavy operations
Report generation
Scheduled reminders
Outbox → projection apply
Automation workflows
```

Flow:

```text
Request
  ↓
Create Job / Outbox row
  ↓
Return
  ↓
Worker
  ↓
Process
  ↓
Success / Retry / Dead Letter
```

Jobs must support:

```text
idempotency
retry
backoff
failure tracking
observability
tenant-safe concurrency keys
```

---

# Scalability and Performance (~10k tenants)

Target: smooth operation for thousands of tenants without redesigning the platform. Optimize the modular monolith; do not invent microservices or sharding early.

## Request path

* Short transactions; no OCR, bulk PDF, or multi-step automation inside the HTTP request that can be deferred.
* Neon pooled connections; avoid connection storms from unbounded parallelism.
* List endpoints paginated; enforce `tenantId` in every query predicate.
* Ban N+1 on list/detail hot paths.

## Derived reads

* Attention / Daily Brief / Operator surfaces read BusinessState projections.
* Optional Redis (or equivalent) **only** for derived hot reads and rate limits — never as money truth.
* Projections indexed by `(tenantId, …)` natural keys.

## Async

* Outbox processor with backoff and dead-letter; concurrency keyed safely per tenant/event type.
* Automation and projection lag are first-class health signals.

## AI

* Bound tools, steps, and tokens per turn.
* Degrade to stub / deterministic brief when provider is down; core billing continues.

## Explicit non-goals until proven

* Premature database sharding
* Per-domain microservices
* Event buses that replace the transactional outbox for money mutations

---

# Error and Failure Model

Every external dependency must be considered unreliable.

Examples:

```text
AI Provider
Email Provider
Object Storage
Database
Queue
Payment Provider
Clerk
```

Use:

```text
Timeouts
Retries
Exponential Backoff
Idempotency
Circuit Breaking where justified
Graceful Degradation
```

The core business system should continue operating when non-critical AI or communication infrastructure is unavailable.

Authentication failure must fail closed.

---

# Observability

Every important request should have:

```text
requestId
traceId
tenantId
userId
```

Authentication and authorization failures should be observable without exposing sensitive authentication information.

## Logs

* Structured application logs.
* Error logs.
* Security-relevant logs.
* Worker/job logs.
* Authentication integration errors.
* Authorization failures.

Sensitive tokens, session data, secrets, and authentication credentials must never be logged.

## Metrics

* Request count.
* Error rate.
* Latency.
* Database performance.
* Queue depth.
* Job failures.
* Outbox lag.
* Projection lag.
* Automation success / fail / skip counts.
* Attention open / dismiss rates (product signal).
* AI usage.
* AI cost.
* AI tool latency.
* Business transaction failures.
* Authentication failures.
* Authorization failures.

## Traces

Trace important flows across:

```text
Request
 ↓
Authentication
 ↓
Authorization
 ↓
Application Service
 ↓
Database
 ↓
Queue
 ↓
Worker
 ↓
External Provider
```

---

# Audit Model

Audit and application logs are separate concepts.

Audit records should capture important business mutations:

```text
Who
What
When
Tenant
Entity
Entity ID
Action
Result
Correlation ID
```

AI actions additionally record:

```text
Authenticated User
Tenant
Agent / Assistant
Model
Tool
Input
Authorization
Approval
Result
```

Authentication and authorization events may be recorded as security events where appropriate.

Audit records must not be casually deleted or overwritten.

---

# Security Model

The system follows defense in depth:

```text
Browser
 ↓
HTTPS
 ↓
Clerk Authentication
 ↓
Application Identity
 ↓
Tenant Resolution
 ↓
Authorization
 ↓
Validation
 ↓
Business Rules
 ↓
Database Constraints
```

Security requirements include:

* Clerk-managed authentication.
* Server-side authorization.
* Tenant isolation.
* Input validation.
* Output encoding.
* CSRF protection where applicable.
* Secure session handling through Clerk.
* Secret management.
* Rate limiting.
* File upload validation.
* Secure headers.
* Dependency scanning.
* Audit logging.
* Sensitive-data redaction.
* AI prompt-injection protections.
* AI tool authorization.

---

# Data Integrity Model

Business truth must be protected by multiple layers:

```text
UI Validation
      ↓
API Validation
      ↓
Domain Validation
      ↓
Database Constraints
```

The UI is never considered a security or integrity boundary.

Database constraints should enforce critical structural invariants wherever practical.

---

# Financial Integrity Rules

The following are mandatory:

1. Every posted journal must balance.
2. Posted financial records cannot be silently edited.
3. Corrections use explicit adjustment/reversal mechanisms.
4. Closed accounting periods reject unauthorized postings.
5. Payment allocation cannot exceed applicable outstanding amounts.
6. Inventory movements must be traceable to their source transaction or authorized adjustment.
7. GST amounts must be calculated from deterministic rules.
8. Financial mutations must be transactional.
9. Financial calculations must use appropriate decimal/money handling rather than floating-point arithmetic.
10. Financial transaction history must remain auditable.

---

# Money Model

Never use JavaScript floating-point numbers as the authoritative representation of monetary values.

Use:

```text
Database:
DECIMAL / NUMERIC

Application:
Decimal / integer-minor-unit representation where appropriate
```

Currency and rounding rules must be explicit.

Example:

```text
₹100.50
```

must never become:

```text
100.499999999
```

because of floating-point arithmetic.

---

# Date and Time Model

* Store timestamps in UTC.
* Convert to the business/user timezone at presentation boundaries.
* Business dates such as invoice dates and accounting dates must be modeled separately from timestamps when necessary.
* Financial-year and tax-period calculations must use the configured business jurisdiction/timezone.
* Never rely on the browser's local timezone for financial calculations.

---

# Configuration Model

Business configuration belongs to the tenant.

Examples:

```text
Business details
GSTIN
Financial year
Invoice numbering
Default tax settings
Default payment terms
Low-stock threshold
Currency
Timezone
```

Configuration changes must be validated and auditable.

Secrets such as API keys and provider credentials must never be stored as ordinary tenant configuration.

---

# API Boundary Rules

All externally reachable mutations must:

1. Authenticate the request through Clerk.
2. Resolve the authenticated application user.
3. Resolve tenant context.
4. Authorize the requested action.
5. Validate input.
6. Execute the appropriate application use case.
7. Return a structured response.
8. Produce appropriate logs/audit/events.

Never allow:

```text
Client → Prisma
```

or:

```text
AI → Prisma
```

or:

```text
Client → arbitrary tenantId → Database
```

---

# Server Action Rules

Server Actions are application boundaries and must be treated like APIs.

Every protected Server Action must:

1. Resolve Clerk authentication.
2. Resolve application identity.
3. Resolve tenant membership.
4. Check authorization.
5. Validate input with Zod.
6. Execute an application use case.
7. Return a safe structured result.

Do not assume that because a Server Action is not directly visible in the browser it is inherently trusted.

---

# Route Handler Rules

Route Handlers must follow the same security model as Server Actions.

```text
HTTP Request
    ↓
Clerk Authentication
    ↓
Application Identity
    ↓
Tenant Resolution
    ↓
Authorization
    ↓
Input Validation
    ↓
Application Use Case
    ↓
Response
```

Route Handlers must not contain large amounts of business logic.

---

# Database Boundary Rules

Application modules should access persistence through repositories or dedicated persistence services.

Avoid spreading Prisma calls throughout:

```text
components/
app/
AI tools/
utility functions/
```

Instead:

```text
Application Use Case
        ↓
Repository
        ↓
Prisma
        ↓
PostgreSQL
```

This keeps persistence replaceable and business logic testable.

---

# File and Upload Security

Uploaded files are untrusted.

The system must validate:

* File size.
* MIME type.
* File extension.
* Storage ownership.
* Tenant ownership.
* Access permissions.

Files must never be executable by the application merely because they were uploaded.

AI document processing must treat extracted document content as untrusted data.

Document contents must never override:

```text
System policies
Authorization
Tool permissions
Business rules
```

---

# Deployment Architecture

Initial production architecture:

```text
                    Internet
                       │
                       ▼
                 CDN / WAF / TLS
                       │
                       ▼
                Next.js Application
                 │             │
                 │             ▼
                 │          Workers
                 │
                 ▼
             PostgreSQL
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     Object    Queue    Optional
    Storage             Redis
```

AI providers and other external services sit outside the core application boundary behind adapters.

Clerk sits outside the application's transactional domain and provides authentication identity to the application.

---

# Environment Model

The project should support:

```text
local
development
staging
production
```

Environment-specific configuration must come from environment variables or a secure configuration system.

Never commit:

```text
Clerk secrets
Clerk webhook secrets
API keys
Database passwords
JWT secrets
AI provider keys
Storage credentials
OAuth secrets
```

Never expose server-only Clerk credentials to the client.

---

# Testing Boundaries

## Unit Tests

Test:

* Domain rules.
* Tax calculations.
* GST calculations.
* Pricing.
* Accounting calculations.
* Inventory calculations.
* Validation.
* Permission logic.

## Integration Tests

Test:

* Database repositories.
* Transactions.
* Posting.
* Payment allocation.
* Inventory updates.
* Event/outbox behavior.
* AI tool authorization.
* Tenant isolation.
* Application identity resolution.

## Authentication Tests

Test:

* Unauthenticated access rejection.
* Authenticated access.
* Application user resolution.
* Clerk user → application user mapping.
* Tenant membership resolution.
* Role authorization.
* Permission authorization.
* Cross-tenant access rejection.
* Authentication webhook handling.
* Webhook idempotency.

## End-to-End Tests

Test critical user journeys:

```text
Sign Up
 ↓
Clerk Authentication
 ↓
Business Setup
 ↓
Create Customer
 ↓
Create Product
 ↓
Create Invoice
 ↓
Record Payment
 ↓
View Dashboard
```

and:

```text
Create Purchase
 ↓
Inventory Updated
 ↓
Supplier Payable Updated
 ↓
Accounting Updated
```

## AI Tests

Test:

* Tool selection.
* Tool authorization.
* Tenant isolation.
* Prompt injection resistance.
* Hallucination-sensitive workflows.
* Action confirmation.
* AI output correctness.
* AI action auditability.
* Identity propagation.
* Permission enforcement.

---

# Scalability Strategy

See also **Scalability and Performance (~10k tenants)** above for concrete request-path, projection, async, and AI constraints.

Scale the modular monolith before introducing distributed complexity:

```text
Modular Monolith
       ↓
Optimize Queries + tenantId indexes
       ↓
BusinessState read models / projections
       ↓
Background Jobs + Outbox consumers
       ↓
Optional Redis for derived hot reads only
       ↓
Horizontal Scaling of the monolith
       ↓
Extract Specific Services Only When Necessary
```

Potential future extraction candidates (only with proof of need):

```text
AI Runtime
Document Processing
Search
Notifications
Analytics
```

Core accounting and transaction logic remain strongly controlled even if infrastructure boundaries evolve. Do not extract the truth engine into a separate service as a default.

---

# Architectural Evolution

## MVP (shipped)

```text
Next.js
   +
Clerk
   +
Modular Business Core
   +
PostgreSQL
   +
Object Storage
   +
Background Workers / Outbox
   +
AI Gateway + typed tools
```

## Post-MVP (active)

```text
MVP base
      +
Typed event catalog + BusinessState projections
      +
Operator / Daily Brief
      +
Automation runtime (L0–L4)
      +
Observability for outbox / projection / automation lag
```

## Growth Stage

```text
Modular Monolith
      +
Redis (derived only)
      +
Dedicated Search (if FTS limits hit)
      +
Analytics Warehouse (derived)
      +
Dedicated AI Runtime (if needed)
```

## Enterprise Stage

```text
Regional Data Planes
        +
Selective Domain Services
        +
Event Platform
        +
Dedicated AI/Agent Runtime
        +
Advanced Governance
```

The architecture must **not** begin with enterprise complexity that the MVP does not need.

---

# Architectural Decisions

## ADR-001 — Clerk Is the Sole Authentication Provider

**Status:** Accepted

Clerk is the authoritative authentication system.

The application uses `@clerk/nextjs`.

**Reason:**

Authentication is a foundational security concern and should not be implemented as custom application logic.

Clerk provides:

* Authentication.
* Sessions.
* Identity.
* Sign-in/sign-up.
* User management.
* Security infrastructure.

Application authorization remains owned by the application.

---

## ADR-001a — Clerk Organizations Are the Workspace Boundary

**Status:** Accepted

Clerk Organizations are the tenant/workspace identity. Application Business records map 1:1 via `clerkOrganizationId`. Multi-user membership is in scope from foundation.

Clerk Organizations do **not** replace application Business data, GSTIN, financial year, or application RBAC.

---

## ADR-002 — Authentication and Authorization Are Separate

**Status:** Accepted

Clerk authenticates users.

The application determines what authenticated users may access.

```text
Clerk
 ↓
Identity
 ↓
Application Authorization
 ↓
Business Data
```

**Reason:**

A valid authenticated user may belong to multiple businesses and may have different permissions within each business.

---

## ADR-003 — Clerk User ID Is External Identity Key

**Status:** Accepted

The application stores the Clerk user identifier as a unique external identity reference.

Email is not used as the authoritative identity relationship.

**Reason:**

Email addresses may change. The Clerk user ID represents the stable external identity.

---

## ADR-004 — AI Uses Application Authorization

**Status:** Accepted

AI operates under the authenticated user's identity, tenant, and permissions.

AI cannot create or modify its own security context.

**Reason:**

The AI must never become an authorization bypass.

---

## ADR-005 — Modular Monolith

**Status:** Accepted

The MVP remains a modular monolith.

**Reason:**

It provides:

* Faster development.
* Simpler deployment.
* Easier transactions.
* Lower infrastructure complexity.
* Clear future extraction boundaries.

---

## ADR-006 — PostgreSQL Is Transactional Source of Truth

**Status:** Accepted

All authoritative business and financial records live in PostgreSQL.

**Reason:**

The MVP requires strong relational integrity, transactions, constraints, reporting queries, and financial consistency.

---

## ADR-007 — Deterministic Financial Logic

**Status:** Accepted

Financial, accounting, inventory, and GST calculations must be performed by deterministic application code.

**Reason:**

LLMs must never become the authoritative source for financial calculations.

---

## ADR-008 — AI Cannot Access the Database Directly

**Status:** Accepted

AI interacts with business data exclusively through typed, authorized application tools/use cases.

**Reason:**

This provides:

* Authorization.
* Validation.
* Tenant isolation.
* Auditability.
* Safer mutations.
* Provider independence.

---

## ADR-008a — Supervisor-Led Dashboard Generative UI

**Status:** Accepted

The business dashboard is composed by a Supervisor agent that delegates to specialized workers (Data Fetcher, Data Analyst, Anomaly Scout, Generative UI Mapper). The UI renders a Zod-validated `DashboardView` JSON mapped to registered shadcn components. Financial figures must cite Data Fetcher fact ids; the LLM must not invent KPIs. If orchestration fails, the canvas falls back to the same mapper driven by `getDashboardOverview`.

**Reason:**

Keeps Dashboard-01 UX flexibility while preserving tenant isolation, auditability, and deterministic financial truth.

---

## ADR-009 — MVP Before Platform Complexity

**Status:** Accepted

Do not introduce infrastructure such as microservices, Kafka, Elasticsearch, complex event buses, or vector databases unless a real MVP requirement justifies it.

**Reason:**

The first objective is to deliver a complete, reliable business workflow for small Indian businesses.

---

# Invariants

1. **Clerk is the sole authentication provider.**
2. **Authentication identity must originate from trusted Clerk server context.**
3. **Every authenticated application user must map to a valid application identity.**
4. **Every business operation is tenant-scoped.**
5. **No request may access another tenant's data.**
6. **The server, not the frontend, is the final authorization boundary.**
7. **AI never receives unrestricted database access.**
8. **AI actions execute through authorized business tools/use cases.**
9. **AI cannot elevate its own permissions.**
10. **AI cannot supply or override authoritative `userId`, `tenantId`, role, or permission context.**
11. **Every important business mutation must be auditable.**
12. **Financial transactions must preserve accounting integrity.**
13. **Total debits must equal total credits for every posted journal.**
14. **Posted financial transactions must not be destructively edited.**
15. **Financial corrections must use explicit reversals or adjustments.**
16. **Inventory changes must occur through authorized inventory operations.**
17. **Payment allocation cannot exceed the amount available for allocation.**
18. **GST calculations must be deterministic and testable.**
19. **Money must never rely on JavaScript floating-point arithmetic for authoritative calculations.**
20. **Long-running work must not execute synchronously inside normal request handlers.**
21. **Background jobs must be retryable and idempotent.**
22. **Event consumers must tolerate duplicate delivery.**
23. **External services must always be treated as failure-prone dependencies.**
24. **Search, cache, analytics, and AI context are derived systems and never the source of transactional truth.**
25. **Uploaded documents are untrusted input.**
26. **Retrieved documents/content cannot override system policies or authorization.**
27. **Closed accounting periods cannot receive unauthorized postings.**
28. **Database constraints must protect critical data invariants wherever practical.**
29. **Domain logic must not depend directly on framework or infrastructure implementations.**
30. **Cross-module access must occur through explicit application/domain interfaces rather than arbitrary table access.**
31. **Every production mutation path must be observable enough to diagnose failures.**
32. **Secrets must never be committed to source control or exposed through logs.**
33. **Non-critical AI, search, notification, or analytics failures must not bring down core business transactions.**
34. **Authentication failures must fail closed.**
35. **Authorization failures must fail closed.**
36. **Clerk webhook processing must be authenticated, validated, and idempotent.**
37. **Clerk-specific implementation must remain outside domain logic.**
38. **The MVP must remain simple enough to understand and operate; complexity must be justified by an actual business or scale requirement.**
