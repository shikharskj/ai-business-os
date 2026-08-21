Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/product-roadmap.md`
3. `context/architecture-context.md`
4. `context/ui-context.md`
5. `context/code-standards.md`
6. `context/ai-workflow-rules.md`
7. `context/progress-tracker.md`

Do **not** implement items from `context/future-scope.md`.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're implementing the first automation vertical: **collections** — overdue → prioritize → draft reminder → L3 confirm or L4 policy send — using existing payment-reminder tooling and AttentionQueue.

### Depends on

- `09-automation-runtime.md`
- `04-attention-queue.md`
- MVP payment-reminder propose/confirm tools

### Scope

- Workflow triggered by overdue attention / `InvoiceOverdue` (or scheduled overdue scan emitting catalog events).
- Prioritize customers/invoices (simple rules: amount, days overdue).
- Draft reminder via existing preview path; execute send via existing confirm or L4 when policy allows.
- Record outcomes (`AutomationOutcomeRecorded`, paid-after-reminder hook when payment posts).
- In-app delivery only in this spec; share channel is spec `15`.
- Idempotency: same overdue set does not spam unbounded reminders (cooldowns/keys).

### Do not

- WhatsApp Business API / SMS providers.
- Auto-post invoices or write off balances.
- Skip confirm when L4 is disabled.

### Follow

- `product-roadmap.md` — R4 collections first
- `architecture-context.md` — Automation Runtime, Autonomy
- Existing MVP confirm + notifications patterns

### Open questions

None remaining.

**Decided:** Collections is the first end-to-end automated path; channel stays in-app until `15`.

### Check when done

- Overdue invoices can flow to a prepared or sent reminder under L3/L4 rules with audit.
- Duplicate runs respect idempotency/cooldown.
- Outcomes are queryable for learning hooks.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `11-automation-expansions.md`).
