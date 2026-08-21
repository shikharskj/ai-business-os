Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the deterministic GST/tax engine that later invoices, purchases, and expenses must call. The AI must never calculate tax.

### Depends on

- `07-shared-kernel.md`

### Scope

- `modules/tax/` domain + application service + unit tests.
- Inputs: business GSTIN, counterparty GSTIN, place of supply, transaction type, HSN/SAC, taxable amount, tax rate, GST registration status.
- Outputs: taxable amount, CGST, SGST, IGST, total tax — using money primitives from spec `07`.
- Intra-state → CGST + SGST; inter-state → IGST. Unregistered / non-GST paths must be explicit and tested.
- Tenant-configurable rates and HSN/SAC references (effective-date aware where practical).
- No UI beyond any settings needed to store default tax rates on the business (can reuse settings page).

### Do not

- Build a government GST filing product, e-invoicing, or e-way-bill integrations.
- Let invoices or the UI invent tax figures without calling this module.
- Use floating-point for tax math.
- Let AI tools compute or override tax.

### Follow

- `architecture-context.md` — GST Model, Financial Integrity Rules, Invariant 18
- `code-standards.md` — GST / Tax Code, Financial Code
- `project-overview.md` — GST & Indian Tax (in scope vs out of scope)

### Open questions

None remaining.

**Decided:** GST depth is **GST-ready, not a GST-filing platform**. This spec implements CGST/SGST/IGST split, HSN/SAC, rates, and stored breakdowns — not filing, e-invoicing, or e-way-bill.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Unit tests cover intra-state, inter-state, and non-GST/unregistered cases.
- Totals use money primitives; debit-style rounding is deterministic and documented.
- Tax module has no dependency on Next.js, Clerk, or Prisma inside `domain/`.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `09-accounting-foundation.md`).
