Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding customer receipts: allocate to invoices (partial/full), update outstanding, post accounting, and keep payment history. No payment gateway.

### Depends on

- `16-sales-invoices.md`

### Scope

- `modules/payments/` customer receipts and allocation lines.
- Record payment against one or more unpaid/partial invoices in the same tenant.
- Partial and full payment. Allocation cannot exceed invoice outstanding or payment amount.
- Update invoice payment status and customer outstanding **from allocations**, not from a handwritten balance.
- Atomic transaction: payment + allocations + accounting post + audit + outbox (`PaymentReceived`).
- Payment method stored as data. MVP methods: **Cash, UPI, Bank Transfer, Card, Cheque**. Do not integrate Razorpay/Stripe/etc.
- UI under Sales → Payments plus invoice detail “Record payment”.
- Permissions `payment:*`.

### Do not

- Build a payment-gateway platform or payout engine.
- Allow over-allocation.
- Mutate posted invoice line amounts to “fix” payment.
- Silently add payment methods beyond Cash, UPI, Bank Transfer, Card, and Cheque, or add a gateway.

### Follow

- `architecture-context.md` — Payments domain, Financial Integrity Rules item 5, Invariant 17
- `code-standards.md` — Financial Code
- `ui-context.md` — Financial Actions, Status Badges (Paid / Partial / Overdue)
- `project-overview.md` — Payments & Outstanding

### Open questions

None remaining.

**Decided:** payment methods are **Cash, UPI, Bank Transfer, Card, Cheque** as recordable labels. No payment gateway in the MVP.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Partial payment leaves remaining outstanding; full payment marks paid.
- Over-allocation is rejected (unit + integration tests).
- Accounting journal for the receipt balances.
- Customer outstanding matches unpaid invoice remainders.
- Cross-tenant payment is rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `18-expenses.md`).
