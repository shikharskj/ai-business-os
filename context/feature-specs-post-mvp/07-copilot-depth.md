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

We're deepening the AI copilot so answers use **BusinessState / AttentionQueue** context and can explain **why** and **what to do next**, with facts still from tools/domain — never invented ledgers.

### Depends on

- `04-attention-queue.md`
- MVP `27`–`28` (gateway, tools, assistant sheet)

### Scope

- Context assembly order: trusted identity → BusinessState/Attention summaries → typed tool results → sanitized conversation (`architecture-context.md` AI Context Assembly).
- Extend system policy / tool guidance so the model prefers tools + state for numbers; distinguish fact vs analysis vs recommendation in UI (existing Trust UI).
- Support diagnostic questions (e.g. profit/sales movement “why”) by composing tool results and state — add tools only if existing ones are insufficient; no raw Prisma in chat route.
- Suggested actions from answers route to confirm flows / brief actions — no free-form mutations.
- Keep SDK confinement and confirm gates from MVP.

### Do not

- Dump multi-table query results into prompts.
- Let model prose become verified fact cards.
- Implement automation engine (`09`) or Guardian forecasts (`16`).
- Redesign the assistant entry point (sheet-only remains).

### Follow

- `architecture-context.md` — AI Context Assembly, AI Access Model, Autonomy
- `code-standards.md` — AI Code Standards, Gateway Usage
- `ui-context.md` — AI Trust UI, Assistant UI
- `product-roadmap.md` — R3

### Open questions

None remaining.

**Decided:** Facts remain tool/domain-built; state speeds context; “why/what next” is grounded.

### Check when done

- Assistant answers a diagnostic question citing tool/state facts without inventing balances.
- Sensitive suggestions still go through confirmation.
- Business pages work when AI is stubbed.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `08-autonomy-policy.md`).
