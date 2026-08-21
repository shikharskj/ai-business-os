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

We're adding the **Needs attention / Daily Brief** surface on the home dashboard, fed by AttentionQueue and BusinessState — deterministic when AI is down. This is not a second chatbot.

### Depends on

- `04-attention-queue.md`

### Scope

- Dashboard (or home) region: yesterday snapshot (sales/collections/expenses from existing overview or projections) + ranked Needs attention list.
- Each row: severity, title, link to domain record, verified amounts from facts/projections only.
- Dismiss control wired to attention API.
- When AI provider is unavailable: still render brief from BusinessState/AttentionQueue (quieter copy).
- Follow `ui-context.md` Daily Brief / Needs Attention patterns; reuse existing dashboard canvas/components where practical.
- Mobile priority: brief readable; not a full desktop clone.

### Do not

- Duplicate the assistant sheet as a second chat on `/app`.
- Invent KPI numbers in client-only math.
- Implement L1–L2 recommendation copy generation beyond static labels (spec `06`).
- Add WhatsApp share (spec `15`).

### Follow

- `ui-context.md` — Daily Brief / Needs Attention, AI Trust UI, Mobile Priorities
- `architecture-context.md` — Experience layer, Business Intelligence Spine
- `product-roadmap.md` — R2 exit criteria (ranked attention without asking)

### Open questions

None remaining.

**Decided:** Brief lives on dashboard; assistant remains top-bar sheet only.

### Check when done

- Owner opening `/app` sees ranked attention without asking the assistant.
- Amounts match server projections/facts; dismiss works.
- With AI stub/down, brief still renders from state.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `06-operator-recommendations.md`).
