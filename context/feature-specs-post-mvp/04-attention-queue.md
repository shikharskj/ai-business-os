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

We're adding an **AttentionQueue** projection and minimal **outcome hooks** (dismiss, reminder-related outcomes) so R2 can render Needs attention without inventing priorities in the UI.

### Depends on

- `02-business-state-projections.md`
- Prefer `03-cash-position-model.md` complete if brief will show cash; not a hard blocker for queue rows

### Scope

- `AttentionQueue` items: tenant-scoped, ranked severity, type (e.g. overdue receivable, low stock, idle quotation if detectable), href to domain record, optional money fact reference, status open/dismissed.
- Populate/update from outbox events + scheduled checks already used for overdue/low stock where possible (reuse notification triggers as signals; do not duplicate broken logic).
- APIs: list open attention for tenant; dismiss (emits `AttentionDismissed` or records outcome); idempotent.
- Minimal outcome hooks: dismiss attention; record “reminder proposed/sent” / “paid after reminder” stubs sufficient for later automation learning (even if only persisted events/rows).
- Authz: same as report/dashboard read; dismiss requires authenticated member with appropriate permission.

### Do not

- Build Daily Brief UI layout (spec `05`).
- Auto-send reminders (spec `10`).
- Pull WhatsApp or future-scope channels.
- Let dismiss mutate invoices or stock.

### Follow

- `architecture-context.md` — Business Intelligence Spine, Event Model (`AttentionDismissed`, `AutomationOutcomeRecorded`)
- `ui-context.md` — Daily Brief / Needs Attention (data contracts only)
- `product-roadmap.md` — R1 outcome hooks
- `code-standards.md` — Projections, Events

### Open questions

None remaining.

**Decided:** Attention is a derived queue with dismiss + outcome hooks; UI is the next spec.

### Check when done

- Overdue and/or low-stock situations produce attention items for the correct tenant.
- Dismiss removes/hides item idempotently and records an outcome/event.
- List API is tenant-isolated and usable without the chat route.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `05-daily-brief-ui.md`).
