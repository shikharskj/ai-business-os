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

**Implementation gate:** After R2–R4 unless progress-tracker pulls for cash-truth metrics.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding **customer advances / retainers** (and optionally supplier advances) so cash received before invoice allocation is recorded correctly and later applied to invoices.

### Depends on

- MVP customer payments + accounting
- Prefer R2–R4 complete unless pulled

### Scope

- Record advance payment (unallocated or held against customer) with cash/bank journal.
- Apply advance to one or more invoices (allocation rules like payments; no over-allocation).
- Outstanding and cash position remain consistent with ledger.
- UI: record advance; apply on payment/invoice screens.
- Outbox events for projections.

### Do not

- Payment gateway / UPI collect links (future-scope / later).
- Redesign allocation engine from scratch — extend existing payment allocation patterns.

### Follow

- MVP `17-customer-payments` patterns
- `architecture-context.md` — Cash model, Payments
- `product-roadmap.md` — R5 advances

### Open questions

None remaining.

**Decided:** Advances are first-class receipts applied later; cash follows ledger.

### Check when done

- Advance increases cash and customer credit; applying to invoice reduces outstanding without double-counting cash.
- Over-application rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (next: `14-sales-orders.md`).
