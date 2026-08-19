Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding GST-oriented summaries and exportable data from stored tax breakdowns. This is not a government filing product.

### Depends on

- `21-accounting-workspace.md`
- `08-tax-engine.md`
- `16-sales-invoices.md`
- `19-purchases.md`

### Scope

- `modules/tax` + `modules/reporting` queries over stored CGST/SGST/IGST on sales and purchases (and expenses if taxed).
- Summary by period: output tax, input tax, taxable amounts.
- Export (CSV or similar) of GST-relevant transaction rows for the tenant.
- UI under Reports or Accounting as a GST summary page — keep it simple.
- All figures from persisted tax lines / tax engine outputs already stored on documents. Do not re-invent tax in the report layer except as a check against stored lines.

### Do not

- File GST returns, GSTR JSON for portals, e-invoice IRN, or e-way-bill.
- Let AI invent GST totals.
- Mix tenants in a summary.

### Follow

- `architecture-context.md` — GST Model, Invariant 18, derived reports are not source of truth
- `project-overview.md` — GST in scope vs out of scope
- `ui-context.md` — Reports density, Indian number formatting

### Open questions

- How much GST functionality belongs in the MVP versus a later release? Confirm before adding filing formats.

See `context/progress-tracker.md` → Open Questions.

### Check when done

- GST summary for a period matches sum of posted document tax breakdowns (test).
- Export is tenant-scoped.
- No filing/e-invoice integration exists.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `23-dashboard.md`).
