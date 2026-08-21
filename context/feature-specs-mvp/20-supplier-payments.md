Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding supplier payments: allocate to purchase bills, update payables, post accounting. Same allocation rules as customer receipts.

### Depends on

- `19-purchases.md`
- `17-customer-payments.md` *(reuse allocation patterns; do not copy-paste a second money library)*

### Scope

- Supplier payments in `modules/payments/` (same module as customer receipts, different document type).
- Allocate to unpaid/partial purchases. No over-allocation.
- Atomic transaction: payment + allocations + accounting + audit + outbox.
- Update purchase payment status and supplier outstanding from allocations.
- UI under Purchases → Payments.
- Permissions `payment:*` (or dedicated supplier-payment permissions if clearer — still server-enforced).
- Payment methods as data: **Cash, UPI, Bank Transfer, Card, Cheque** (same set as spec `17`).

### Do not

- Add a payment gateway.
- Allow paying another tenant’s bills.
- Mutate posted purchase lines to adjust payment.

### Follow

- `architecture-context.md` — Payments, Invariant 17
- `code-standards.md` — Financial Code, reuse existing abstractions
- `ui-context.md` — Financial Actions
- `project-overview.md` — supplier payments / payables

### Open questions

None remaining.

**Decided:** payment methods are **Cash, UPI, Bank Transfer, Card, Cheque**. No gateway.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Partial/full supplier payment updates payable correctly.
- Over-allocation is rejected (tests).
- Journal balances.
- Cross-tenant access is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `21-accounting-workspace.md`).
