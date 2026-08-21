Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding sales quotations: create/edit/view/list, customer and product lines, discounts, and GST preview via the tax engine. Converting a quotation into an invoice is completed in spec `16`.

### Depends on

- `14-inventory.md`
- `11-customers.md`
- `08-tax-engine.md`

### Scope

- `modules/sales/` quotation + quotation lines.
- Select customer, add catalog products/services, quantity, line discount, tax via `modules/tax` (preview/store breakdown on the quotation).
- Money primitives for all amounts. Numbering per tenant (quotation number series).
- Status: draft / sent / accepted / cancelled / converted (converted set by spec `16`).
- UI under Sales. Do not post inventory or accounting for quotations.
- Tenant + `invoice:create`-adjacent quotation permissions (define `quotation:*` if cleaner).
- Audit create/update/status changes.

### Do not

- Convert to invoice in a half-finished way — stub the action if `16` is not done, or implement conversion **in spec `16` only**.
- Reduce stock or post journals from a quotation.
- Recalculate GST ad hoc in the UI.

### Follow

- `architecture-context.md` — Sales domain, GST Model, Money Model
- `ui-context.md` — Forms, Tables, Financial Actions
- `project-overview.md` — Sales quotations
- `code-standards.md` — Financial Code, GST / Tax Code

### Open questions

None that block quotations.

### Check when done

- Owner can create a quotation with lines, discount, and deterministic GST preview.
- Quotation does not change stock or ledgers.
- Cross-tenant access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `16-sales-invoices.md`).
