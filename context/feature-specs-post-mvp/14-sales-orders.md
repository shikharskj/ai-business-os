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

**Implementation gate:** After R2–R4 unless progress-tracker pulls for quotation→invoice friction metrics.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding **sales orders** as an optional step between quotation and invoice for businesses that need confirmed orders before billing — without inventory reservation complexity beyond MVP stock rules.

### Depends on

- MVP quotations + sales invoices
- Prefer R2–R4 complete unless pulled

### Scope

- Sales order entity: customer, lines, status (draft/confirmed/cancelled/fulfilled), convert from quotation and/or create directly.
- Convert sales order → draft/posted invoice (copy lines); prevent double-convert.
- No full warehouse allocation; inventory still moves on invoice post (document clearly).
- List/detail/UI; permissions; audit; outbox events (`SalesOrderConfirmed` etc. in catalog).
- Idle order may feed attention later (optional hook).

### Do not

- MRP, multi-warehouse, or ATP engines.
- Auto-fulfill without invoice.
- POS / barcode.

### Follow

- MVP quotation → invoice conversion patterns
- `product-roadmap.md` — R5 sales orders
- `architecture-context.md` — Frozen posting (invoice still posts stock)

### Open questions

None remaining.

**Decided:** Order confirms commercial intent; stock truth remains on invoice post for MVP compatibility.

### Check when done

- Quotation → order → invoice path works; double convert rejected.
- Invoice post still owns inventory/accounting.
- Production build succeeds.
- `context/progress-tracker.md` is updated (next: `15-share-delivery.md`).
