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

**Implementation gate:** After collections automation (`10`) / R2–R4 unless pulled for distribution metrics.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding **shareable delivery** for invoices and payment reminders: in-app copy link, Web Share API / share sheet, and downloadable PDF already available — **not** WhatsApp Business API, SMS, or email provider integration.

### Depends on

- `10-collections-automation.md` (for reminder share hooks)
- MVP invoice PDF / documents

### Scope

- Generate stable, authz-aware share links or payloads for invoice PDF / reminder summary where product allows (tenant + token or logged-in-only deep links — prefer secure patterns; no public PII leak).
- UI: Share buttons on invoice detail and reminder confirm/brief prepare.
- Collections automation may attach “share” as L2 prepare outcome.
- Channel abstraction remains open for future WhatsApp without implementing it.

### Do not

- Integrate WhatsApp Business API, Twilio SMS, or marketing email.
- Expose unsigned public URLs with full financial PII.
- Block on future-scope mobile apps.

### Follow

- `future-scope.md` — WhatsApp stays later
- `product-roadmap.md` — R5 share delivery
- `ui-context.md` — actions on brief/invoice
- Notifications channel abstraction spirit from MVP `26`

### Open questions

None remaining.

**Decided:** Non-WhatsApp share/deep-link/PDF only in Post-MVP catalog.

### Check when done

- Owner can share invoice/reminder via link or system share sheet without a third-party messaging API.
- Unauthorized users cannot read another tenant’s document via link.
- Production build succeeds.
- `context/progress-tracker.md` is updated (next: `16-business-guardian.md`).
