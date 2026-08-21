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

We're adding a typed domain-event catalog and outbox consumer registry so mutations fan out beyond notifications (projections, later automation) without changing the transactional outbox primitive.

### Depends on

- MVP complete (`feature-specs-mvp/` `01`–`28`), especially outbox usage in shared-kernel and notifications consumer

### Scope

- Document and code a **typed event catalog** (names, payload schemas/version, aggregate types) for core mutations already emitted (and gaps called out): e.g. `SalesInvoicePosted`, `PaymentReceived`, `PurchasePosted`, `InventoryAdjusted`, `StockLow`, `ExpenseRecorded`, `QuotationAccepted`, plus stubs for `InvoiceOverdue`, `QuotationIdle`, `AttentionDismissed`, `AutomationOutcomeRecorded` as needed for later specs.
- Keep **outbox persist in the same DB transaction** as the domain mutation (existing pattern).
- Introduce consumer **registry** under `modules/` (e.g. `modules/events/`): register handlers by `eventType`; notifications remain one consumer.
- Idempotent processing (processed-event / natural keys); small payloads (ids + essentials); load domain data by id in consumers.
- Processor path: existing outbox/cron or worker — extend safely; backoff/retry; failure must not roll back original business TX.
- Align string `eventType` values across emitters; fix drift where inventing new names.

### Do not

- Introduce Kafka, Redis streams, or a second message bus.
- Redesign invoice/purchase/payment/expense posting pipelines.
- Make events the source of financial truth.
- Implement BusinessState projections (spec `02`) or automation runtime (spec `09`) in this spec.
- Start MVP `29`/`30`.

### Follow

- `architecture-context.md` — Event Model, Business Intelligence Spine (events half), Frozen vs Extend-Only, Background Processing
- `code-standards.md` — Events, Async / Background Jobs
- `product-roadmap.md` — R1
- `ai-workflow-rules.md` — Event Rules

### Open questions

None remaining.

**Decided:** Outbox table remains the persistence primitive; typed catalog + consumers expand under `modules/` without changing “emit in same TX.”

### Check when done

- Catalog documents (and Zod/types enforce) known event types used by emitters.
- At least two consumers can register (notifications + a no-op or logging projection stub proving registry works) without breaking idempotent notification behavior.
- Duplicate delivery does not double-apply unbounded side effects for the stub/consumer under test.
- Core post invoice still succeeds if a consumer fails after commit (retry/outbox, not in-request).
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `02-business-state-projections.md`).
