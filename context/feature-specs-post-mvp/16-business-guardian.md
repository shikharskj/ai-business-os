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

We're adding **Business Guardian** capabilities: look-ahead cash runway warnings, collections intelligence hints, and inventory “order N” recommendations — labeled as predictions; posting and quantities stay deterministic.

### Depends on

- `02-business-state-projections.md`, `03-cash-position-model.md`, `04-attention-queue.md`
- `09-automation-runtime.md` (for optional prepare actions)

### Scope

- Cash runway: project near-term cash using CashPosition + scheduled receivables/payables heuristics (document assumptions); emit attention when below threshold.
- Collections intel: rank follow-ups using history fields available (days overdue, amount); L1 recommend — no credit-bureau.
- Inventory: suggest order quantity from simple velocity + lead-time defaults; L1/L2 prepare purchase — do not auto-post.
- Cross-domain affordability helper: “can I afford X?” using cash + open AR/AP summaries — returns structured facts + labeled estimate.
- UI: Guardian section on brief or linked insights; predictions never overwrite fact cards.
- Optional tools for assistant to query guardian summaries.

### Do not

- Guarantee forecast accuracy or replace accountants.
- Auto-execute purchases/payments.
- Build full seasonality ML platform.

### Follow

- `product-roadmap.md` — R6
- `architecture-context.md` — predictions labeled; truth engine owns quantities
- `ui-context.md` — Trust UI (fact vs prediction)

### Open questions

None remaining.

**Decided:** Predictions are labeled; domain services own posts and stock.

### Check when done

- Cash-below-threshold and reorder suggestions appear as attention/insights with labeled estimates.
- Affordability answer cites cash/AR/AP facts.
- No auto-posting.
- Production build succeeds.
- `context/progress-tracker.md` is updated (next: `17-ai-operations-bookkeeper.md`).
