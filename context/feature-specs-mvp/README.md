# Feature Specs (MVP archive)

Numbered files in this folder are the **completed MVP** execution archive (`01`–`30`).

**Active Post-MVP work:** [`context/feature-specs-post-mvp/`](../feature-specs-post-mvp/) — implement one numbered spec at a time.

```text
Read AGENTS.md and context files
      ↓
Mark the current Post-MVP spec In Progress in progress-tracker.md
      ↓
Implement exactly one spec from feature-specs-post-mvp/
      ↓
Verify its Check when done
      ↓
Update progress-tracker.md
      ↓
Next numbered Post-MVP spec
```

## Rules

* MVP specs `01`–`28` are **complete** (system of record + thin AI).
* Specs `29` (automated testing) and `30` (production hardening) remain in this folder but are **deferred until launch** — after Post-MVP (`feature-specs-post-mvp/`) and future-scope work. Do **not** run them in parallel with R1–R7.
* Do **not** re-implement completed MVP specs.
* Product sequencing: `context/product-roadmap.md`.
* Specs are implementation briefs. Architecture, UI, and coding rules live in the context files.

## Accepted product decisions

Owner-confirmed. Specs must follow these; do not re-open them during implementation.

| Area | Decision | Why |
| ---- | -------- | --- |
| PostgreSQL | Neon PostgreSQL | Serverless Postgres, autoscaling, connection pooling, usage-based pricing |
| Object storage | Cloudflare R2 | S3-compatible, no egress fees, inexpensive storage |
| AI provider | Gemini (or OpenAI) + provider abstraction | Same `lib/ai` contract; Gemini preferred locally; OpenAI adapter retained |
| Multi-user | Yes, from foundation | Avoids painful tenant/member redesign later |
| Payment methods | Cash, UPI, Bank Transfer, Card, Cheque | Covers the core Indian SMB use cases |
| GST depth | GST-ready, not GST-filing platform | Enough for MVP without huge compliance scope |
| Accounting | Simple Indian double-entry accounting | Financially correct without building Tally/ERP-level accounting |
| Clerk Organizations | Yes | Natural tenant/workspace boundary and future team support |

## Spec template

Every spec after `01` uses this shape:

1. Read `AGENTS.md` and the context files. Mark this spec In Progress before coding.
2. One-sentence objective.
3. **Depends on**
4. **Scope**
5. **Do not**
6. **Follow**
7. **Open questions**
8. **Check when done**

## Catalog

| Spec | Unit |
| ---- | ---- |
| 01 | Design system *(complete)* |
| 02 | Project foundation *(complete)* |
| 03 | Authentication — Clerk *(complete)* |
| 04 | Tenant / business setup *(complete)* |
| 05 | Authorization *(complete)* |
| 06 | Application shell *(complete)* |
| 07 | Shared kernel *(complete)* |
| 08 | Tax engine *(complete)* |
| 09 | Accounting foundation *(complete)* |
| 10 | Documents / storage *(complete)* |
| 11 | Customers *(complete)* |
| 12 | Suppliers *(complete)* |
| 13 | Products / catalog *(complete)* |
| 14 | Inventory *(complete)* |
| 15 | Quotations *(complete)* |
| 16 | Sales invoices *(complete)* |
| 17 | Customer payments *(complete)* |
| 18 | Expenses *(complete)* |
| 19 | Purchases *(complete)* |
| 20 | Supplier payments *(complete)* |
| 21 | Accounting workspace *(complete)* |
| 22 | GST reporting *(complete)* |
| 23 | Dashboard *(complete)* |
| 24 | Reports *(complete)* |
| 25 | Search *(complete)* |
| 26 | Notifications *(complete)* |
| 27 | AI gateway and tools *(complete)* |
| 28 | AI assistant *(complete)* |
| 29 | Automated testing *(deferred until launch)* |
| 30 | Production hardening *(deferred until launch)* |
