Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding purchase/supplier bills: supplier, lines, tax, totals, inventory in, payables, and accounting post.

### Depends on

- `18-expenses.md`
- `12-suppliers.md`
- `13-products-catalog.md`
- `14-inventory.md`
- `08-tax-engine.md`
- `09-accounting-foundation.md`

### Scope

- `modules/purchases/` purchase + lines.
- Supplier selection, products/services, quantity, purchase price, tax via tax engine, total.
- Status and unpaid/partial/paid (paid in spec `20`).
- On post, one transaction: purchase rows, inventory stock-in for tracked items via inventory module, accounting journal (including payables), audit, outbox (`PurchaseCreated` / posted equivalent).
- Tenant numbering for purchases.
- UI under Purchases → Bills.
- No destructive edit of posted purchases.

### Do not

- Write stock or journals from the purchases repository.
- Use floats for money.
- Implement warehouse/MRP.
- Record supplier payment here (spec `20`).

### Follow

- `architecture-context.md` — Purchases, Inventory Model, Accounting Model, Transaction Model
- `code-standards.md` — same financial/inventory/accounting rules as sales invoices
- `ui-context.md` — Tables, Forms, Detail Pages
- `project-overview.md` — Purchases

### Open questions

GST/accounting convention questions remain; use modules from specs `08` and `09`.

### Check when done

- Posted purchase increases inventory via movements and creates a balanced journal.
- Supplier payable outstanding reflects unpaid posted purchases (before spec `20` payments, full unpaid).
- Posted amounts cannot be silently edited.
- Cross-tenant access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `20-supplier-payments.md`).
