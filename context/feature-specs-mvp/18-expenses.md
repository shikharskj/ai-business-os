Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding business expenses: categories, date, amount, tax, payment method, optional attachments, list/filter, and accounting post.

### Depends on

- `17-customer-payments.md`
- `10-documents-storage.md`
- `08-tax-engine.md`
- `09-accounting-foundation.md`

### Scope

- `modules/expenses/` vertical slice.
- Record expense: category, date (business date), amount (money primitive), optional tax via tax engine, payment method (same data labels as payments), notes.
- Attach supporting documents through documents module.
- List, filter by category and date, detail view.
- On post/record: accounting journal + audit + outbox (`ExpenseRecorded`) in one transaction.
- Permissions `expense:*`.
- UI under Expenses.

### Do not

- Build payroll, reimbursements workflow engine, or corporate cards.
- Store amount as float.
- Bypass documents authz for attachments.
- Skip accounting post for posted expenses.

### Follow

- `architecture-context.md` — Expenses module, Transaction Model, Documents
- `ui-context.md` — Forms, Tables, Attachments
- `project-overview.md` — Expenses
- `code-standards.md` — Financial Code, GST / Tax Code

### Open questions

None remaining.

**Decided:** payment method labels match spec `17`: **Cash, UPI, Bank Transfer, Card, Cheque**. Do not add a gateway.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Owner can record, list, filter, and attach evidence to an expense in their tenant.
- Posted expense creates a balanced journal.
- Cross-tenant access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `19-purchases.md`).
