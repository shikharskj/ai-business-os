Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding customers as a vertical slice: model, use cases, tenant-scoped list/detail UI, search, and deactivate.

### Depends on

- `08-tax-engine.md` *(GSTIN/tax fields on the party; tax calc itself is not required to create a customer)*
- `06-application-shell.md`
- `05-authorization.md`

### Scope

- `modules/party/` customer entity (customers and suppliers share the party module; this spec ships **customers only**).
- Fields: name, contacts, addresses, GSTIN, tax-related flags, status (active/inactive).
- Use cases: create, edit, view, deactivate, list, search/filter.
- UI: list page with one primary action “New customer”, detail page per UI context (header, status, key info, outstanding placeholder, activity later).
- Outstanding receivable: show `₹0` or “No invoices yet” until spec `17`. Do not fake balances.
- Zod at the boundary. Server-side tenant + `customer:*` permissions.
- Audit create/update/deactivate. Outbox `CustomerCreated` (and similar) via spec `07` helpers.

### Do not

- Query another module’s tables directly.
- Implement invoices or payments here.
- Soft-skip tenant checks.
- Use floating-point for any stored outstanding field (prefer derived later).

### Follow

- `architecture-context.md` — Business Domain Boundaries (`party`), Module Structure, Tenant isolation
- `ui-context.md` — Tables, Forms, Detail Pages, Empty States, Indian Business UX
- `code-standards.md` — Domain Logic, Repository Pattern, React / Next.js
- `project-overview.md` — Customer Management

### Open questions

None that block customers.

### Check when done

- Owner can create, edit, view, list, search, and deactivate a customer in their business only.
- Cross-tenant customer ID access is rejected (test).
- Outstanding is a placeholder, not a fabricated ledger.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `12-suppliers.md`).
