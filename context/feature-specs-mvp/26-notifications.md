Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding in-app notifications from domain events: invoice created/posted, payment received, invoice overdue, low stock. Email/SMS/WhatsApp stay future.

### Depends on

- `25-search.md`
- `07-shared-kernel.md` *(outbox)*

### Scope

- `modules/notifications/` + consumer of outbox events (Postgres-backed job or in-process worker — keep it simple; must be idempotent).
- In-app notification list in the top-bar slot from spec `06`.
- Events: invoice posted/created, payment received, invoice overdue (scheduled check is fine), low stock after movements.
- Channel abstraction that can later add email/SMS/WhatsApp. Implement **in-app only**.
- Tenant-scoped. Mark read/unread.
- Notification failure must not roll back the original business transaction (process from outbox after commit).

### Do not

- Integrate email/SMS/WhatsApp providers in this spec.
- Introduce Kafka or a second message bus.
- Bypass tenant checks.
- Make notifications the source of financial truth.

### Follow

- `architecture-context.md` — Event Model, Background Processing, Invariant 33
- `ui-context.md` — Notifications, Toasts vs inbox
- `project-overview.md` — Notifications
- `code-standards.md` — Async / Background Jobs, Events

### Open questions

None that block in-app notifications.

### Check when done

- Posting an invoice (or receiving a payment, adjusting stock below threshold) creates an in-app notification for that tenant after outbox processing.
- Duplicate event delivery does not duplicate unread spam unbounded (idempotency key).
- Other tenants do not see the notification.
- Core invoice post still succeeds if the notifier is down (or is clearly outbox-retry, not in-request).
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `27-ai-gateway-tools.md`).
