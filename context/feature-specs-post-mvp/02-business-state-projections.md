Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/product-roadmap.md`
3. `context/architecture-context.md`
4. `context/ui-context.md`
5. `context/code-standards.md`
6. `context/ai-workflow-rules.md`
7. `context/progress-tracker.md`

Do **not** implement items from `context/future-scope.md`.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding tenant-scoped **BusinessState** projections updated from outbox events, with a rebuild/backfill path, so dashboard and assistant can share derived state without ad-hoc multi-table scans in the chat route.

### Depends on

- `01-typed-domain-events.md`

### Scope

- Projection store(s) keyed by `tenantId` (Prisma tables or equivalent) for at least: `ReceivablesRisk` summary, `InventoryRisk` / low-stock summary, `SalesMomentum` (period rollup or stub with clear formula), and a projection envelope/version suitable for later `AttentionQueue` (spec `04` may own the queue rows).
- Idempotent outbox consumers that **upsert** projections from catalog events (posted invoices, payments, stock movements, expenses as applicable).
- Projection writers **aggregate domain truth only** — never invent money; use existing repositories/use cases or ledger reads.
- **Rebuild/backfill** command or job per projection family for a tenant (or all tenants) from source documents/ledgers.
- Read APIs (application queries) for projections with authz (`report:read` or existing equivalent) and tenant isolation.
- Indexes on `(tenantId, …)` natural keys.

### Do not

- Build 50 new report screens or a warehouse.
- Let AI or projections post journals or mutate stock.
- Skip rebuild capability.
- Implement Daily Brief UI (spec `05`) or cash ledger definition details beyond what projection needs (cash is spec `03`).
- Redesign posting pipelines.

### Follow

- `architecture-context.md` — Business Intelligence Spine, Scalability (~10k), Frozen vs Extend-Only
- `code-standards.md` — Projections / BusinessState, Queries and Read Models
- `product-roadmap.md` — R1 exit criteria (shared state APIs)

### Open questions

None remaining.

**Decided:** Projections are derived and rebuildable; facts for chat still come from tools/domain — projections speed attention/context.

### Check when done

- After posting an invoice / recording payment / stock movement (as wired), projection rows for that tenant update via outbox consumer.
- Rebuild for a tenant reproduces consistent projection state from source data.
- Cross-tenant reads are rejected.
- Chat route is not required to run multi-table ad-hoc SQL for these summaries (query APIs exist).
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `03-cash-position-model.md`).
