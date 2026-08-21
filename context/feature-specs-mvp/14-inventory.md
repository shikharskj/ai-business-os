Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding movement-based inventory: opening stock, adjustments, current stock, low-stock detection, and movement history. Sales and purchase movements are wired in later specs through this module’s interface.

### Depends on

- `13-products-catalog.md`

### Scope

- `modules/inventory/`.
- Inventory movements as the source of truth. Current stock is derived (or a constrained projection updated only by authorized movements).
- Opening stock movement, manual adjustment (permission `inventory:adjust`), movement history UI.
- Low-stock detection using tenant threshold (business config from spec `04` or a catalog/inventory setting).
- Only inventory-tracked products participate.
- Application interface for later sale stock-out and purchase stock-in. Do not let sales/purchases write stock tables directly when those specs land.
- Tenant-scoped Stock page under Inventory.
- Audit adjustments.

### Do not

- Allow arbitrary UPDATE of a stock balance column outside a movement.
- Implement manufacturing, warehouses, batches, or MRP.
- Post accounting for opening stock unless a simple posting rule is already supported by spec `09` — if posting opening stock, it must be balanced and tested; otherwise document deferral to `16`/`19` and do not silently skip an invariant.

### Follow

- `architecture-context.md` — Inventory Model, Invariant 16
- `code-standards.md` — Inventory Code
- `ui-context.md` — Tables, Alerts for low stock
- `project-overview.md` — Inventory

### Open questions

None that block inventory movements.

### Check when done

- Opening stock and adjustments change derived quantity through movements only.
- Direct balance mutation is impossible via the public use cases (test).
- Low-stock products can be listed.
- Cross-tenant stock access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `15-quotations.md`).
