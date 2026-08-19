Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the automated test suites required by the tracker: unit, integration, auth, tenant isolation, financial invariants, and Playwright journeys. This spec fills gaps; it does not replace tests already required inside earlier specs.

### Depends on

- `28-ai-assistant.md`

### Scope

- Vitest for unit + integration, React Testing Library where UI behavior is critical, Playwright for E2E.
- Unit: tax, GST, invoice totals, discounts, payment allocation, inventory movements, accounting posting, permission rules.
- Integration: repositories, transactions (invoice/payment/inventory/accounting), tenant isolation, AI tools, auth-aware services.
- Auth tests: unauthenticated cannot access protected resources; Clerk secrets never on client.
- E2E journeys from the tracker:
  - sign up → business setup
  - sign in → protected app
  - customer → invoice → payment
  - product → sale → inventory update
  - purchase → inventory → payable
  - expense → accounting/report
  - AI question → verified business answer
  - sign out → protected resources inaccessible
- CI runs unit/integration always; E2E on CI with documented env (Clerk test instance, Postgres — local in CI, **Neon** for hosted/production-like runs).

### Do not

- Skip tenant-isolation tests.
- Use production Clerk secrets in CI logs.
- Treat UI-only tests as sufficient for financial invariants.

### Follow

- `architecture-context.md` — Testing Boundaries
- `code-standards.md` — Testing Standards
- `progress-tracker.md` — Testing Progress / E2E Tests
- `ai-workflow-rules.md` — verification before completion

### Open questions

None remaining for vendor choice.

**Decided:** hosted PostgreSQL is **Neon**; AI is **OpenAI**. CI against hosted Postgres/Clerk still needs credentials — do not commit secrets.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Listed unit/integration suites exist and pass locally.
- Playwright covers the journeys (or a documented subset with failing tests listed — prefer all journeys green).
- CI is updated beyond lint/typecheck/build to run tests.
- Production build still succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `30-production-hardening.md`).
