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

We're defining **cash position** as ledger cash/bank account balances (payment methods map into those accounts on posting) and exposing it as a BusinessState projection/API so AI cannot invent cash from invoice tables alone.

### Depends on

- `02-business-state-projections.md`
- MVP accounting foundation + payment posting (cash/bank accounts already exist or are ensured)

### Scope

- Document and implement the cash model: cash = balances of designated cash/bank COA accounts for the tenant.
- Ensure payment method → account mapping on customer/supplier payments and expenses is consistent with this model (fix gaps only; do not redesign journals).
- `CashPosition` projection (or query + projection) updated from relevant outbox events / rebuild from ledger.
- Authz-scoped read API returning money facts with currency/scale; cite fact ids if used by UI/assistant later.
- Tests or fixtures proving cash moves when a payment posts to cash/bank.

### Do not

- Invent cash by summing unpaid invoices.
- Build full cash-flow forecasting (that is Guardian, spec `16`).
- Add banking integrations or payment gateways.
- Change tax engine behavior.

### Follow

- `architecture-context.md` — Cash model, Business Intelligence Spine, Accounting Model
- `code-standards.md` — Financial Code, Projections
- `product-roadmap.md` — R1 cash concept

### Open questions

None remaining.

**Decided:** Cash position comes from ledger cash/bank accounts; payment methods map into those accounts on posting.

### Check when done

- Recording a customer receipt (cash/bank method) changes `CashPosition` consistently with ledger balances.
- AI/tool path can read cash only via this API/projection (documented); no invoice-table cash heuristic in modules/ai.
- Rebuild reproduces cash from ledger.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `04-attention-queue.md`).
