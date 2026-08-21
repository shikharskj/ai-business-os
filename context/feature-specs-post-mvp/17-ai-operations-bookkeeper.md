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

We're adding **AI Operations / bookkeeper prepare**: upload a purchase bill → extract/match → prepare purchase + stock + journal proposal → human approves → **domain services post**. AI prepares; truth engine posts.

### Depends on

- `09-automation-runtime.md`
- MVP documents storage + purchases + accounting

### Scope

- Upload bill image/PDF to documents; kick async extraction job (OCR/vision via AI gateway adapter — provider-agnostic).
- Extract vendor, lines, amounts, GST fields into a structured draft; match supplier/products where possible (fuzzy; user can fix).
- Prepare purchase draft (and inventory/accounting preview) without posting.
- Confirmation UI (L3): show prepared fields; on confirm call existing `postPurchase` / create+post use cases inside a transaction.
- Audit AI prepare + human confirm; idempotency on confirm.
- Failures leave no partial posted purchase.

### Do not

- Auto-post without confirmation.
- Let the model invent tax rates that bypass the tax engine on final post (recompute via tax engine on confirm).
- Build full multi-doc inbox product beyond this path.
- WhatsApp capture.

### Follow

- `product-roadmap.md` — R7
- `architecture-context.md` — AI prepares; domain posts; untrusted uploads
- `code-standards.md` — AI tools, documents, financial posting
- MVP purchases + documents

### Open questions

None remaining.

**Decided:** Human confirm required; tax engine recomputes on post; extraction is assistive.

### Check when done

- User can upload a bill, review prepared purchase, confirm, and get a posted purchase with balanced journal and stock where applicable.
- Cancel/discard leaves no posted document.
- Cross-tenant document access rejected.
- Production build succeeds.
- `context/progress-tracker.md` is updated (Post-MVP catalog complete; next horizon = `future-scope.md` / launch `29`–`30` when ready).
