# Feature Specs

Numbered files in this folder are the **execution order** for MVP implementation.

```text
Read AGENTS.md and context files
      ↓
Mark the current spec In Progress in progress-tracker.md
      ↓
Implement exactly one spec
      ↓
Verify its Check when done
      ↓
Update progress-tracker.md
      ↓
Next numbered spec
```

## Rules

* Implement **one spec at a time**.
* Do **not** skip a numbered dependency.
* Do **not** implement later specs “while you are here.”
* Specs `01`–`25` are complete through search. Next implementable spec is `26-notifications.md`.
* Specs are implementation briefs. Architecture, UI, and coding rules live in the context files — follow those pointers instead of inventing behavior.
* Do **not** silently reverse Accepted decisions in `context/progress-tracker.md`. Confirm any *new* open question with the project owner before choosing a vendor or expanding scope.

## Accepted product decisions

Owner-confirmed. Specs must follow these; do not re-open them during implementation.

| Area | Decision | Why |
| ---- | -------- | --- |
| PostgreSQL | Neon PostgreSQL | Serverless Postgres, autoscaling, connection pooling, usage-based pricing |
| Object storage | Cloudflare R2 | S3-compatible, no egress fees, inexpensive storage |
| AI provider | OpenAI initially + provider abstraction | Strong capability, mature API, easy to replace later |
| Multi-user | Yes, from foundation | Avoids painful tenant/member redesign later |
| Payment methods | Cash, UPI, Bank Transfer, Card, Cheque | Covers the core Indian SMB use cases |
| GST depth | GST-ready, not GST-filing platform | Enough for MVP without huge compliance scope |
| Accounting | Simple Indian double-entry accounting | Financially correct without building Tally/ERP-level accounting |
| Clerk Organizations | Yes | Natural tenant/workspace boundary and future team support |

## Spec template

Every spec after `01` uses this shape:

1. Read `AGENTS.md` and the six context files. Mark this spec In Progress before coding.
2. One-sentence objective.
3. **Depends on**
4. **Scope**
5. **Do not**
6. **Follow**
7. **Open questions** (none remaining for the accepted product decisions; new questions still need owner confirmation)
8. **Check when done**

## Catalog

| Spec | Unit |
| ---- | ---- |
| 01 | Design system *(complete)* |
| 02 | Project foundation |
| 03 | Authentication — Clerk *(complete)* |
| 04 | Tenant / business setup |
| 05 | Authorization |
| 06 | Application shell |
| 07 | Shared kernel |
| 08 | Tax engine |
| 09 | Accounting foundation |
| 10 | Documents / storage |
| 11 | Customers |
| 12 | Suppliers |
| 13 | Products / catalog |
| 14 | Inventory |
| 15 | Quotations |
| 16 | Sales invoices |
| 17 | Customer payments |
| 18 | Expenses |
| 19 | Purchases |
| 20 | Supplier payments |
| 21 | Accounting workspace |
| 22 | GST reporting |
| 23 | Dashboard |
| 24 | Reports |
| 25 | Search |
| 26 | Notifications |
| 27 | AI gateway and tools |
| 28 | AI assistant |
| 29 | Automated testing |
| 30 | Production hardening |
