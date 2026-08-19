Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding MVP reports that read authoritative business and accounting data: sales, expenses, profit, receivables, payables, inventory, GST, ledger, trial balance.

### Depends on

- `23-dashboard.md`
- `21-accounting-workspace.md`
- `22-gst-reporting.md`

### Scope

- `modules/reporting/` query use cases + Reports UI.
- Reports: sales, expense, profit summary, receivables, payables, inventory, GST-oriented summary (reuse `22`), basic ledger, basic trial balance (reuse `21` queries if possible).
- Date filters. Export where practical (CSV).
- Reports consume journals / documents — they do not write financial truth.
- Permission `report:read`. Tenant isolation.

### Do not

- Recalculate GST with a second algorithm.
- Allow reports to mutate data.
- Build BI cubes or a third-party analytics product.

### Follow

- `architecture-context.md` — Reporting, Source of Truth
- `ui-context.md` — Tables, Filters, Charts
- `project-overview.md` — reports list and success criterion 13

### Open questions

None beyond existing GST/accounting convention questions — do not expand report packs without confirmation.

### Check when done

- Each listed report renders for the owner’s tenant with date filters.
- Receivables/payables match outstanding from payments specs.
- Trial balance/ledger match accounting workspace.
- Cross-tenant report access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `25-search.md`).
