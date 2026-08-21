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

We're adding thin additional automations on the runtime: **idle quotation follow-up**, **reorder prepare** (recommend/prepare purchase — do not auto-post), and **unusual expense** alert to attention.

### Depends on

- `09-automation-runtime.md`
- `04-attention-queue.md`

### Scope

- Quotation idle: detect accepted/sent quotations with no conversion for N days (configurable default); create attention + optional L1/L2 follow-up draft (no auto-email unless channel exists).
- Reorder: from InventoryRisk / velocity stub — L1 recommend or L2 prepare draft purchase inputs; **never** auto-post purchase.
- Expense anomaly: simple rule (e.g. amount vs recent average threshold) → attention item + inform/recommend; no auto-categorization rewrite.
- Reuse autonomy policy; default L3+ off for money posts.

### Do not

- Auto-post purchases or expenses.
- Build full Guardian forecasting (`16`).
- Add barcode/batch inventory features.

### Follow

- `product-roadmap.md` — R4 expand
- `architecture-context.md` — Automation Runtime
- `code-standards.md` — Automation

### Open questions

None remaining.

**Decided:** Prepare-only for purchases; alerts for expenses; quotation follow-up is attention-first.

### Check when done

- Each of the three flows can produce attention and/or a non-posting prepare/recommend outcome under policy.
- No silent purchase/expense posts.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next recommended product path is `16-business-guardian.md` after R5 pull rules — or `12`–`15` if pulled; default next after R4 stack: implement R5 only if pulled, else `16`).
