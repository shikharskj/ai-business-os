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

We're adding **Operator recommendations** on the Daily Brief at autonomy **L0–L2** (inform / recommend / prepare drafts) with clear cues — without executing mutations except via existing confirm flows.

### Depends on

- `05-daily-brief-ui.md`

### Scope

- For each attention item (or brief section), attach recommended next step labels (L1) and optional **prepare** actions (L2) e.g. “Prepare payment reminder” that opens existing assistant confirm preview or a dedicated preview using current payment-reminder tool path.
- Autonomy cues in UI per `ui-context.md` (Inform / Recommend / Prepare / Confirm).
- Prefer deterministic recommendation rules from attention type (overdue → remind; low stock → review stock) over free-form LLM for this spec; optional LLM copy only if it does not invent numbers.
- No L3/L4 auto-send in this spec (that is `08`–`10`).

### Do not

- Auto-send reminders or post documents.
- Bypass confirm-token path for mutations.
- Implement full automation runtime (`09`).

### Follow

- `ui-context.md` — Autonomy cues, AI Action Confirmation
- `architecture-context.md` — AI Autonomy Model (L0–L2)
- `product-roadmap.md` — R2 Operator
- Existing MVP assistant confirm for reminders

### Open questions

None remaining.

**Decided:** L0–L2 on the brief; L3+ stays confirm/automation specs.

### Check when done

- Brief shows recommended actions with correct autonomy cues.
- Prepare reminder still requires confirm before mutation (existing gate).
- No silent L4 sends.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `07-copilot-depth.md`).
