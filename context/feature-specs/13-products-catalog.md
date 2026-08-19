Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding products and services: SKU, units, prices, HSN/SAC, tax configuration, and optional inventory tracking.

### Depends on

- `12-suppliers.md`
- `08-tax-engine.md`

### Scope

- `modules/catalog/` vertical slice.
- Create/edit/view/list/search products and services.
- Fields: name, SKU/item code, unit of measurement, selling price, purchase price, HSN/SAC, tax rate reference, category (simple), inventory-tracking flag.
- Prices use money primitives. Do not store price as `Float`.
- Stock availability: if inventory tracking is off, do not show a fake stock number. If on, show `0` until spec `14` movements exist (or “No stock movements yet”).
- Tenant + catalog permissions. Audit important changes.
- UI under Inventory → Products.

### Do not

- Implement stock movements or adjustments here (spec `14`).
- Recalculate GST inside the catalog UI — store classification/rate references for the tax engine.
- Allow SKU uniqueness to leak across tenants (unique per tenant, not globally).

### Follow

- `architecture-context.md` — Catalog domain, Money Model
- `ui-context.md` — Tables, Forms, Status Badges
- `project-overview.md` — Product & Service Management
- `code-standards.md` — Financial Code (prices)

### Open questions

None that block catalog.

### Check when done

- Owner can create a product with SKU, unit, prices, HSN/SAC, tax, and inventory flag, scoped to their business.
- Money fields are decimals.
- Cross-tenant product access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `14-inventory.md`).
