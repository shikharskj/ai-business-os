Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding shared primitives used by every financial and auditable workflow: money, business dates, rupee display, audit records, and outbox events.

### Depends on

- `06-application-shell.md`

### Scope

- Money type using decimal / integer minor units — **never** JavaScript `number` for authoritative amounts. Prisma `DECIMAL`/`NUMERIC` for stored money.
- Explicit rounding and INR scale (2 decimal places unless a later tax rule requires otherwise).
- UTC timestamps vs business calendar dates (invoice date, accounting date) as separate fields where needed.
- `components/business/` display helpers for Indian grouping (`₹1,25,000`) using semantic tokens, not hardcoded hex.
- Append-only audit record primitive (actor, tenant, action, resource, timestamp, metadata). No updates/deletes of audit rows.
- Outbox event primitive written in the same database transaction as the domain mutation (table + helper). Consumers come later.
- Shared Zod helpers for money and dates at API/form boundaries.

### Do not

- Use floating-point arithmetic for totals, tax, or balances.
- Store money as `Float`.
- Use the browser timezone for financial calculations.
- Add customers, invoices, or other business documents in this spec.
- Make search, cache, or AI the source of truth.

### Follow

- `architecture-context.md` — Money Model, Date and Time Model, Audit Model, Event Model, Financial Integrity Rules, Invariants 11, 19, 21–22
- `code-standards.md` — TypeScript (money), Financial Code, Events, Logging
- `ui-context.md` — Number and Financial Formatting, Financial Colors, Terminology

### Open questions

None that block this spec. Currency is INR for the Indian small-business MVP.

### Check when done

- Unit tests prove money addition/rounding does not use IEEE floats for the stored result.
- Rupee display formats Indian grouping.
- Audit helper inserts append-only rows.
- Outbox helper can persist an event alongside a dummy transactional write.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `08-tax-engine.md`).
