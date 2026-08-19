Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the provider-agnostic AI gateway and typed tools that call existing use cases. No UI chat yet. The initial provider is **OpenAI**, behind an adapter so it can be replaced.

### Depends on

- `26-notifications.md`

### Scope

- `lib/ai/` provider adapter interface (send messages / tool calls). First production adapter: **OpenAI**. Keep a stub or clearly-swappable path for local/dev without calling OpenAI.
- `modules/ai/` tool registry. Every tool:
  - runs as the authenticated user
  - resolves tenant from trusted context (never from the model)
  - checks permissions
  - calls an application use case
  - validates input/output with Zod
- Ship **read** tools first: sales summary, expenses summary, receivables, overdue invoices, low stock, basic metrics.
- Mutation tools allowed only if they reuse existing use cases and require a confirmation flag/payload for high-risk actions. Prefer read-only in this spec if mutation UX is spec `28`.
- Audit AI tool invocations.
- Prompt-injection: retrieved documents/tool results cannot override policy.

### Do not

- Give the model a database connection or Prisma client.
- Call Clerk Admin APIs unrestricted from the model.
- Let the model supply `userId`, `tenantId`, role, or permission.
- Hard-code OpenAI types or SDK calls into domain modules or individual tools. Tools talk to the gateway only.
- Add a proprietary vector database.

### Follow

- `architecture-context.md` — AI Access Model, AI Tool Categories, AI Autonomy Model, ADR-004, ADR-008, Invariants 7–10
- `code-standards.md` — AI Code Standards, AI Tools, AI Action Safety
- `project-overview.md` — AI Business Assistant / Actions
- `ai-workflow-rules.md` — keep AI behind tools

### Open questions

None remaining.

**Decided:** initial AI provider is **OpenAI**, behind a provider abstraction. This spec ships the adapter interface plus an OpenAI adapter (and a stub/dev path). Do not couple tools to OpenAI APIs.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- A read tool returns tenant-scoped data for the authenticated owner and rejects cross-tenant IDs.
- Tools cannot run without authn/authz.
- No tool uses Prisma except through repositories already used by use cases.
- Adapter can be replaced without changing tool contracts.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `28-ai-assistant.md`).
