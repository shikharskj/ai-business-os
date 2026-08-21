Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the AI assistant UI: ask questions, show facts vs recommendations, confirm sensitive actions, and audit AI actions. It must use tools from spec `27` only.

### Depends on

- `27-ai-gateway-tools.md`

### Scope

- Assistant UI in the shell (page + top-bar entry) per UI context: conversation, citations/facts vs suggestions, loading and error states.
- Answer the MVP questions using tools (sales, spend, profit, who owes, who we owe, stock, overdue, expenses, GST-related stored data, attention items).
- Distinguish business facts from recommendations in the UI.
- High-risk mutations require explicit user confirmation before the mutation tool runs.
- Low-risk drafts (e.g. payment reminder text) may not mutate records until confirmed.
- Audit every AI-initiated mutation.
- Core business pages must work if the AI provider is down (assistant error state only).

### Do not

- Query the database from the chat route.
- Hide confirmation for financial mutations.
- Let the assistant change permissions, tax engine internals, or posted journals except via existing reversal use cases + confirmation.
- Treat the model as the tax or accounting calculator.

### Follow

- `ui-context.md` — AI Assistant UI, AI Trust UI, AI Action Confirmation, AI Suggested Actions, AI Loading/Errors
- `architecture-context.md` — AI Access Model, Invariants 7–10, 33
- `code-standards.md` — AI Output, AI Prompt Standards, AI Context
- `project-overview.md` — success criteria 17–21, 24

### Open questions

None remaining.

**Decided:** initial AI provider is **OpenAI**, behind the spec `27` adapter. Confirm production credentials at deploy time; keep the adapter. Core pages must still work if OpenAI is down.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Owner can ask “who owes me money?” and get a tenant-scoped factual answer from tools.
- Sensitive action shows confirmation and does not mutate until confirmed.
- AI down does not break invoices/dashboard.
- Evaluation or integration tests cover tool authz and no raw SQL path.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `29-automated-testing.md`).
