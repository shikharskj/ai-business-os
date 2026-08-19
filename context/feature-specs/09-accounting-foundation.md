Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the accounting posting foundation: chart of accounts, journals, and a posting service later transactions must use. Little or no accounting UI in this spec.

### Depends on

- `07-shared-kernel.md`

(Tax engine `08` is a sibling; posting of GST lines will use tax *outputs* from later transaction specs, not this module calculating tax.)

### Scope

- `modules/accounting/` with Prisma models: Account, Journal, JournalLine.
- MVP chart of accounts seed appropriate for a small Indian business (income, expenses, cash/bank, receivables, payables, tax payable/receivable, inventory if needed). Keep the chart small.
- Posting service: given balanced lines + tenant + source reference, insert a journal in a DB transaction.
- Invariant: for every posted journal, total debits = total credits (money primitives).
- Posted journals cannot be updated or deleted. Corrections are reversal/adjustment journals only (API in this spec; UX in spec `21`).
- Period field on journals (financial year / period from tenant config). Reject posting into a closed period (closed-period flag can be tenant-level even if the close UX is later).
- Application interface other modules will call. No other module writes journal tables directly.

### Do not

- Build ledger/trial-balance screens (spec `21`).
- Silently edit posted rows.
- Use floating-point for line amounts.
- Let AI post journals except through this service in later AI specs.
- Implement a full Indian statutory chart or multi-company consolidation.

### Follow

- `architecture-context.md` — Accounting Model, Transaction Model, Financial Integrity Rules, Invariants 12–15, 27
- `code-standards.md` — Accounting Code, Financial Code, Repository Pattern
- `project-overview.md` — Basic Accounting

### Open questions

Do **not** silently resolve these. Confirm with the project owner before expanding the chart or Indian conventions:

- Which Indian accounting conventions should be implemented in the first release? *(this spec: simple double-entry + small CoA; no statutory packing)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- Posting a balanced journal succeeds; an unbalanced journal is rejected.
- Posted journals cannot be mutated (test).
- Domain does not import Prisma; infrastructure repository does.
- Seed CoA is tenant-safe (per business, not global shared mutable rows unless copied per tenant).
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `10-documents-storage.md`).
