Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding suppliers in `modules/party/`, parallel to customers: CRUD/deactivate, GSTIN, list/detail, search, payable placeholder.

### Depends on

- `11-customers.md`

### Scope

- Supplier entity in `modules/party/` (do not create a second party module).
- Fields aligned with customers where they share meaning: name, contacts, addresses, GSTIN, status.
- Use cases: create, edit, view, deactivate, list, search/filter.
- UI under Purchases → Suppliers. Detail page with outstanding payable placeholder until spec `20`.
- Tenant + `supplier:*` permissions. Audit + outbox `SupplierCreated`.
- Reuse party address/GSTIN validation patterns from customers.

### Do not

- Duplicate customer code in an unrelated module.
- Record purchases or supplier payments here.
- Trust client `tenantId`.
- Invent a CRM/pipeline.

### Follow

- `architecture-context.md` — Party domain (customers and suppliers)
- `ui-context.md` — same list/detail/form patterns as customers
- `project-overview.md` — Supplier Management
- `code-standards.md` — prefer existing abstractions

### Open questions

None that block suppliers.

### Check when done

- Owner can manage suppliers only within their tenant.
- Cross-tenant supplier access is rejected (test).
- Payable outstanding is a placeholder until payments exist.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `13-products-catalog.md`).
