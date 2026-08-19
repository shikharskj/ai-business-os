Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the accounting workspace UI and period handling on top of the posting service: ledger, trial balance, reversals/adjustments. Posted journals stay immutable.

### Depends on

- `20-supplier-payments.md`
- `09-accounting-foundation.md`

### Scope

- Ledger query UI (filter by account, date/period).
- Basic trial balance for a period (debits = credits overall).
- Financial period handling: view current period; close period (rejects further unauthorized posts — already enforced in `09`).
- Reversal / adjustment workflow: create compensating journals via posting service, never UPDATE posted lines.
- UI under Accounting. Use money display components from spec `07`.
- Permission `accounting:post` / `report:read` as appropriate. Server-side only.

### Do not

- Edit posted journals in place.
- Recalculate the ledger from invoices in the UI, bypassing journals.
- Build multi-company consolidation or a full statutory auditor pack.
- Let AI post without going through this module’s use cases (later specs).

### Follow

- `architecture-context.md` — Accounting Model, Invariants 12–15, 27
- `ui-context.md` — Tables, Financial Colors, Trust and Transparency
- `code-standards.md` — Accounting Code
- `project-overview.md` — Basic Accounting

### Open questions

None remaining.

**Decided:** accounting is **simple Indian double-entry**. This spec is ledger, trial balance, period close, and reversals — not statutory reports beyond TB/ledger.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Trial balance balances for a tenant with posted invoices, payments, expenses, and purchases.
- Posted journal cannot be edited; reversal creates a new balanced journal (test).
- Closed period rejects new posts (test).
- Cross-tenant ledger access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `22-gst-reporting.md`).
