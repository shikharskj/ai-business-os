Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding unified global search using PostgreSQL full-text search for common business records.

### Depends on

- `24-reports.md`

### Scope

- `modules/search/` queries over tenant-scoped customers, suppliers, products, invoices, purchases, payments, expenses.
- Top-bar search from spec `06` wired to this module.
- Result rows: type, name/identifier, relevant metadata (status, amount, party) per UI context.
- Filters where useful: date, status, party — do not expose every database column.
- Search index is **derived**. PostgreSQL remains source of truth; do not introduce Elasticsearch.

### Do not

- Return another tenant’s rows.
- Make search the write path.
- Add a vector database.

### Follow

- `architecture-context.md` — Search Model, Storage Model (FTS)
- `ui-context.md` — Search, Filters, Top Bar
- `project-overview.md` — Search, success criterion 15

### Open questions

None that block FTS.

### Check when done

- Owner can search the listed entity types and open the matching record.
- Tenant isolation holds (test).
- Empty and no-match states are handled.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `26-notifications.md`).
