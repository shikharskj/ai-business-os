Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the business overview dashboard from authoritative data: sales, expenses, profit, receivables/payables, stock, overdue, and alerts. AI insights are a slot only.

### Depends on

- `22-gst-reporting.md`

### Scope

- Dashboard page as the authenticated landing screen.
- KPIs from application queries (not from AI): revenue, expenses, profit, receivables, payables, cash/payment summary, low-stock, overdue invoices.
- Recent invoices and recent expenses lists.
- Date filter (at least this month / custom range) using business timezone from tenant config.
- Charts using existing Chart primitive; do not hard-code colors — semantic tokens.
- Placeholder region for “AI insights” that stays empty or hidden until spec `28`.
- Permission `report:read`. Tenant-scoped.

### Do not

- Call an LLM to compute KPIs.
- Query another tenant.
- Treat the dashboard cache as source of truth if you add caching later.
- Build a full analytics warehouse.

### Follow

- `ui-context.md` — Dashboard, Cards, Charts and Analytics, Tables vs Charts, Financial Colors
- `architecture-context.md` — Reporting module, derived data rules
- `project-overview.md` — Dashboard & Reporting, success criterion 1

### Open questions

None remaining.

**Decided:** AI provider is **OpenAI initially + provider abstraction**. Unused on the dashboard; do not call an LLM for KPIs.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Owner sees KPIs that match underlying invoices, expenses, payments, and stock for the selected period (spot-check tests or integration assertions).
- Unauthenticated users cannot load dashboard data.
- Empty states work for a new business.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `24-reports.md`).
