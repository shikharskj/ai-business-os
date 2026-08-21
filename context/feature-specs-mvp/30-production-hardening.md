Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding production-readiness foundations: logging, error monitoring hooks, secret management, Docker, CI/CD, backups/runbooks, and Clerk production configuration. Production vendors are decided: **Neon** (Postgres), **Cloudflare R2** (object storage), **OpenAI** (AI, via adapter).

### Depends on

- `29-automated-testing.md`

### Scope

- Structured logging + request correlation in `lib/observability/`. No `console.log` as the production logger.
- Error monitoring hook (adapter; vendor not mandatory to hard-code).
- Docker image for the Next.js app. Document how to run with env files.
- CI/CD pipeline: lint, typecheck, tests, build, migrate (documented).
- Secret management: env-only, never commit `.env`. Clerk production keys documented as env vars.
- Backup strategy checklist for **Neon** PostgreSQL (document branching/point-in-time as applicable).
- HTTPS/domain/deployment checklist in `docs/` runbook.
- Clerk production instance checklist (follow Clerk Skill/docs). Document Clerk Organizations in production (same app as development).
- Production env documentation for Neon, R2, and OpenAI (adapter). Secrets remain env-only.
- E2E smoke subset for release.
- Confirm core transactions still work if AI/search/notifications are disabled.

### Do not

- Re-open vendor choice (Neon, R2, OpenAI) or swap them without updating architecture and the tracker.
- Commit secrets.
- Introduce microservices, Kafka, or Elasticsearch “for production.”
- Weaken tenant isolation or authz for convenience.

### Follow

- `architecture-context.md` — Observability, Deployment Architecture, Environment Model, ADR-009
- `code-standards.md` — Logging, Observability, Production Build Standards, Security
- `progress-tracker.md` — Production Readiness list
- `project-overview.md` — success criteria 25–26

### Open questions

None remaining.

**Decided:**

- PostgreSQL hosting: **Neon**
- Object storage: **Cloudflare R2**
- AI provider: **OpenAI** behind the existing adapter

Wire these in production config and runbooks. Do not commit secrets.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Production build succeeds in CI.
- Runbook exists for deploy, backups (Neon), Clerk prod env (including Organizations), R2, OpenAI, and secret rotation.
- Adapters for DB/storage/AI remain swappable; production defaults are Neon, R2, and OpenAI.
- No secrets in git.
- MVP release checklist in docs is filled against the tracker’s Production Readiness items (unchecked items stay explicit).
- `context/progress-tracker.md` is updated (this spec Complete; catalog finished).
