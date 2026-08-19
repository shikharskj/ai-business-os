Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're completing the remaining project foundation so the app has typed config, a modular folder structure, a local PostgreSQL connection via Prisma, and CI for lint/typecheck/build.

### Depends on

- `01-design-system.md` *(complete)*

### Scope

- Typed environment configuration (Zod) for required local vars. Do not hard-code secrets.
- Establish folders from architecture, even if some stay empty except `.gitkeep` or a barrel:
  - `modules/`
  - `lib/db/`
  - `lib/auth/`
  - `lib/security/`
  - `lib/observability/`
  - `lib/storage/`
  - `lib/queue/`
  - `lib/ai/`
  - `prisma/`
  - `tests/`
  - `workers/`
  - `components/business/`
- Install Prisma and connect to **local** PostgreSQL.
- Add a minimal Prisma schema (generator + datasource only). Do **not** add all business models yet.
- Add a Prisma client helper in `lib/db/`.
- Development scripts: `prisma migrate`, `prisma generate`, and keep `dev` / `build` / `lint` working.
- ESLint/formatting scripts consistent with the existing Next.js ESLint setup. Do not introduce a second style system.
- GitHub Actions workflow: install, lint, typecheck, production build. Database tests are not required in this spec.

### Do not

- Model customers, invoices, or other business tables.
- Choose a production PostgreSQL host.
- Add Redis, Kafka, Elasticsearch, or a vector database.
- Implement Clerk, tenant logic, or the authenticated app shell (those are later specs).
- Put Prisma calls in React components.

### Follow

- `architecture-context.md` — System Boundaries, Storage Model, Configuration Model, Deployment Architecture
- `code-standards.md` — Runtime Validation, Prisma / Database Access, File Organization, Production Build Standards
- `ai-workflow-rules.md` — Database Change Rules, Scoping Rules

### Open questions

Do **not** silently resolve these. Confirm with the project owner before locking a production choice:

- Which PostgreSQL hosting provider should be used? *(local Postgres only for this spec)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- Application runs locally (`npm run dev`).
- `npm run lint` succeeds.
- Type checking succeeds.
- Production build succeeds.
- Prisma can connect to local PostgreSQL and generate the client.
- Folder structure matches architecture boundaries.
- CI workflow exists for lint / typecheck / build.
- `context/progress-tracker.md` is updated (this spec Complete; next is `03-authentication-clerk.md`).
