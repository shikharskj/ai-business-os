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

**Implementation gate:** Only after Post-MVP specs `05`–`11` (R2–R4) unless `progress-tracker.md` records an explicit pull with a metric (GST corrections / returns).

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding **credit notes / returns** against posted sales (and purchase returns if in scope) with correct GST storage, inventory movement where needed, and balanced journals — extending the frozen posting pipelines, not redesigning them.

### Depends on

- MVP sales invoices + purchases + accounting + tax engine
- Prefer R2–R4 complete unless pulled

### Scope

- Credit note (sales) linked to original invoice where applicable: lines, GST breakdown via tax engine, status lifecycle, post → journal + stock in if goods returned.
- Purchase return / debit note if required for symmetry with payables (minimal viable).
- Permissions, audit, outbox events in catalog.
- UI: create/list/detail; link from invoice.
- Report/GST summary inclusion of credit notes.

### Do not

- E-invoice / GSTR filing portals.
- Silent destructive edits of posted invoices (use credit notes).
- WhatsApp delivery.

### Follow

- `architecture-context.md` — Accounting, GST, Frozen vs Extend-Only
- `code-standards.md` — Financial / GST / Inventory
- MVP invoice/purchase patterns
- `product-roadmap.md` — R5 credit notes

### Open questions

None remaining for sales credit notes.

**Decided:** Corrections via credit notes/returns; posted invoices stay immutable.

### Check when done

- Posted credit note updates AR/stock/GST stored fields correctly with balanced journal.
- Tenant isolation and authz enforced.
- Outbox event emitted for projections.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `13-advances-retainers.md` or resume R6 if batching R5).
