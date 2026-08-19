Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding sales invoices as an atomic business transaction: numbering, lines, discounts, GST, status, inventory out, accounting post, audit/outbox, and print/export PDF. Also convert an accepted quotation into an invoice.

### Depends on

- `15-quotations.md`
- `09-accounting-foundation.md`
- `14-inventory.md`
- `08-tax-engine.md`
- `10-documents-storage.md` *(for storing generated PDF)*

### Scope

- Sales invoice + lines in `modules/sales/`.
- Tenant invoice numbering.
- Customer selection, product/service lines, quantity, discount, tax **only** via tax engine, invoice total via money primitives.
- Status: draft / posted / unpaid / partially paid / paid / cancelled (keep the set small and explicit). Posted financial effects happen on post, not on every draft save.
- On post, **one database transaction**:
  - validate customer and products
  - calculate prices and GST
  - write invoice + lines
  - inventory stock-out for inventory-tracked items via inventory module
  - accounting journal via accounting posting service
  - audit + outbox (`SalesInvoicePosted`)
- Convert quotation → invoice (copy lines, mark quotation converted). Do not double-post.
- Print/export invoice PDF (server-side). Store via documents adapter.
- UI: list, create, detail with GST breakdown and payment status (payments land in spec `17`).
- Permissions `invoice:*`. Fail closed. No destructive edit of posted invoices — corrections later via reversal/credit mechanisms, not silent UPDATE of posted amounts.

### Do not

- Use JavaScript floats for totals.
- Let the UI submit authoritative tax amounts that bypass `modules/tax`.
- Write inventory or journal tables from the sales repository.
- Implement a payment gateway.
- Build e-invoicing/NIC APIs.

### Follow

- `architecture-context.md` — Transaction Model, Accounting Model, Inventory Model, GST Model, Invariants 12–18
- `code-standards.md` — Financial Code, GST / Tax Code, Accounting Code, Inventory Code, Server Actions
- `ui-context.md` — Financial Actions, Detail Pages, Status Badges
- `project-overview.md` — Sales success criteria

### Open questions

Do **not** silently resolve:

- How much GST functionality belongs in the MVP versus a later release? *(use tax engine from spec `08` only)*
- Which Indian accounting conventions should be implemented in the first release? *(post through spec `09` CoA)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- Posted invoice is all-or-nothing (test rollback).
- Posted journal balances; GST matches tax-engine output.
- Inventory-tracked products decrease via movements, not balance edits.
- Posted invoice amounts cannot be silently edited.
- Quotation conversion creates one invoice and cannot convert twice.
- Cross-tenant access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `17-customer-payments.md`).
