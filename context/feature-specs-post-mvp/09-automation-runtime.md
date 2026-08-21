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

We're adding a generalized **automation runtime**: EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME, executed off the request path with idempotency, audit, and autonomy checks — without posting journals/stock directly.

### Depends on

- `08-autonomy-policy.md`
- `01-typed-domain-events.md`

### Scope

- Module boundary (`modules/workflows/` and/or automation consumers) for workflow definitions and runs.
- Runner: load event → evaluate condition → propose/execute action via **existing domain use cases + authz** → record result/outcome events.
- Jobs/workers; idempotency keys; retries/backoff; tenant-safe concurrency.
- Observability hooks: success/fail/skip counts (logging/metrics stubs OK).
- Plug-in point for collections vertical (implemented in spec `10`).
- No UI required beyond optional run history for owners (minimal).

### Do not

- Post journals or inventory from the runner directly.
- Auto-run L4 without policy checks.
- Implement all verticals in this spec (only framework + one dry-run or no-op workflow proof).
- Introduce Kafka.

### Follow

- `architecture-context.md` — Automation Runtime, Background Processing, Scalability
- `code-standards.md` — Automation, Events, Async jobs
- `product-roadmap.md` — R4 pattern

### Open questions

None remaining.

**Decided:** Automations call domain use cases only; first real vertical is collections in `10`.

### Check when done

- A registered workflow can run from an outbox event in a worker with idempotent replay.
- Failed action does not corrupt domain money invariants; outcome recorded.
- Autonomy policy is consulted before L4 execute.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `10-collections-automation.md`).
