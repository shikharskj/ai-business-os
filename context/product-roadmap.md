# AI Business OS — Post-MVP Product Roadmap

**Status:** Vision locked (post MVP specs `01`–`28`)  
**Base:** Shipped MVP ([`context/feature-specs-mvp/`](feature-specs-mvp/))  
**Active execution:** numbered specs in [`context/feature-specs-post-mvp/`](feature-specs-post-mvp/) (`01`–`17`)  
**Launch trust tracks:** MVP `29` automated testing and `30` production hardening are **deferred until launch** (after Post-MVP + [`future-scope.md`](future-scope.md)) — not parallel to R1–R7  
**Non-goal:** Feature parity with Vyapar or other billing ERPs  
**After this roadmap:** see [`context/future-scope.md`](future-scope.md) (do not pull into active Post-MVP work)

---

## North star

> **An AI-native operating system for Indian SMEs that handles the essential mechanics of running a business, continuously understands what is happening, tells the owner what matters, recommends what to do, and automates routine work wherever it safely can.**

The product should feel less like *accounting software with AI* and more like:

> **A business companion that happens to have billing, inventory, and finance underneath it.**

### Moat (not feature count)

```text
Business data
  → business understanding
  → recommendations
  → automation
  → actions
  → outcomes / learning
  → better understanding
```

### Evolution story

```text
MVP (done)     Record my business correctly
     ↓
R1             Understand my business continuously
     ↓
R2             Tell me what matters (proactive)
     ↓
R3             Do routine work for me (safely) — after Copilot depth
     ↓
R4             Automate routine work under policy
     ↓
R5             Fill only blocking coverage gaps
     ↓
R6             Warn me before problems happen
     ↓
R7             Handle administrative capture for me
     ↓
Future         Help me run / grow the business  → future-scope.md
```

---

## Principles (non-negotiable)

1. **Must-have coverage, not parity** — cover essential domains; refuse billing-ERP surface-area chase.
2. **Automation over screens** — before a multi-click workflow, ask whether the system can prepare or do most of it.
3. **AI understands the business** — not “ChatGPT + invoices”; context → reasoning → actions.
4. **Deterministic systems own truth** — accounting, GST, stock, balances, permissions, and posting stay in domain services; AI operates them through tools.
5. **Architecture before intelligence** — every feature strengthens events, state, autonomy, jobs, and observability for ~10k tenants without a rewrite.
6. **No new screen** unless it feeds business state/events or reduces owner actions.
7. **No auto-mutation** without autonomy level, audit, and idempotency.

---

## Where we are (MVP base)

Treat this as **complete for product planning** — do not rebuild as “foundation projects.”

| Layer | Shipped (specs) | Meaning |
| ----- | --------------- | ------- |
| Foundation | `01`–`10` | Auth, tenant, authz, shell, money/dates, tax engine, accounting foundation, documents |
| Parties & catalog | `11`–`13` | Customers, suppliers, products/services |
| Inventory (basic) | `14` | Movements, adjustments, low stock |
| Money loop | `15`–`20` | Quotation → invoice → receipt; purchase → supplier payment; expenses |
| Books & India GST-ready | `21`–`22` | Journals/ledger/TB; GST summaries/export (not filing) |
| Awareness UI | `23`–`26` | Dashboard, reports, search, in-app notifications |
| Thin copilot | `27`–`28` | Tool-grounded Q&A + confirmable payment reminders |

### Known coverage gaps (admit; do not block the OS wedge)

- Sales orders
- Credit notes / returns
- Advances / retainers
- E-invoice / e-way / GSTR filing
- Barcode, batch/expiry, multi-location
- WhatsApp/SMS channels
- Native offline / POS / hardware

These enter later **only when they unlock collections, compliance, or automation** — see R5 and [`future-scope.md`](future-scope.md).

---

## Autonomy model (product safety)

| Level | Behavior | Example |
| ----- | -------- | ------- |
| **L0** | Inform | “ABC is overdue ₹1.2L” |
| **L1** | Recommend | “Follow up with ABC today” |
| **L2** | Prepare | Draft reminder / draft PO |
| **L3** | Execute with approval | Confirm send reminder / confirm post |
| **L4** | Auto within limits | Reminder under ₹25k if policy allows |

MVP today ≈ **L0–L3** for one path (overdue → propose reminder → confirm). Post-MVP generalizes this. **L5 unrestricted financial autonomy is forbidden.**

---

## Success metrics

| Metric | Question |
| ------ | -------- |
| Owner effort | Actions to finish a routine task? |
| Automation rate | % of routine work without manual steps? |
| Time saved | Hours/week returned to the owner? |
| Attention quality | Right issues, right time? |
| Decision quality | Better cash / stock / credit decisions? |
| Business coverage | Essential ops without leaving the OS? |

**Not primary:** feature count vs competitors.

---

## Post-MVP releases (active backlog)

Naming: these are the **next product releases**, not a rewrite of MVP.

| Release | Name | Objective |
| ------- | ---- | --------- |
| **R1** | Business Intelligence Spine | Continuously understand business state |
| **R2** | AI Business Operator | Proactively tell what matters |
| **R3** | Copilot Depth | Ask *why* and *what next* on real state |
| **R4** | Automation Engine | Do routine work under autonomy policies |
| **R5** | Coverage Completers | Fill only blocking money/compliance gaps |
| **R6** | Business Guardian | Look ahead (cash, collections, stock) |
| **R7** | AI Operations / Bookkeeper | Document → prepared postings |

### Sequence (locked)

```text
MVP base
  → R1 Intelligence Spine
  → R2 Operator (Daily Brief)     ← primary product moment
  → R3 Copilot Depth
  → R4 Automation Engine (collections first)
  → R5 Coverage Completers (as needed)
  → R6 Guardian
  → R7 AI Operations
```

**Do not** finish sales orders / credit notes / advances before R2 unless a concrete automation or compliance story requires them.

---

### R1 — Business Intelligence Spine

**Objective:** The OS maintains living business understanding — not only on-demand reports.

**Build**

1. Typed business event catalog (extend outbox; notifications become one consumer among many).
2. Derived business state (tenant-scoped projections), e.g. `CashPosition`, `ReceivablesRisk`, `PayablesPressure`, `InventoryRisk`, `SalesMomentum`, `AttentionQueue`.
3. Cash as a defined concept (ledger cash/bank account balances; payment methods map into those accounts).
4. Outcome hooks (minimal): dismiss attention, reminder sent, paid after reminder.

**Do not:** build 50 new report screens; let the model invent balances; redesign invoice/journal posting.

**Exit criteria:** Attention items listable without ad-hoc SQL in the chat route; dashboard/assistant share state APIs; domain mutations emit documented events.

---

### R2 — AI Business Operator

**Objective:** Move from reactive chat to proactive companion.

**Build:** Daily Business Brief and in-app Needs attention; attention engine; L0–L1 by default; L2 drafts where cheap.

**Exit criteria:** Owner sees ranked attention without asking; each item links to facts/domain records; core billing works if AI provider is down (brief can be deterministic from state).

---

### R3 — Copilot Depth

**Objective:** Natural language over R1 state + tools — answers include **why** and **what to do**.

**Exit criteria:** “Why” answers cite facts/state; sensitive suggestions route through confirm / autonomy.

---

### R4 — Automation Engine

**Objective:** Turn intelligence into work.

```text
EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME
```

**First vertical:** Collections (overdue → priority → draft → send under L3/L4). Then idle quotation follow-up, reorder recommendation (prepare only), unusual expense alert.

**Exit criteria:** At least one end-to-end automated path with audit + idempotency + outcome; autonomy matrix configurable per tenant.

---

### R5 — Coverage Completers (selective)

**Objective:** Close only gaps that block trust, GST stories, or automation.

**Priority candidates (validate before building):** credit notes/returns; WhatsApp or equivalent delivery; advances/retainers; sales orders; inventory barcode/batch/locations only with demand.

**Rule:** each item needs a metric. No “competitor has it.”

---

### R6 — Business Guardian

**Objective:** Look ahead — cash runway, collections intelligence, inventory “order N”, cross-domain affordability. Predictions are labeled; posting and quantities stay deterministic.

---

### R7 — AI Operations / Bookkeeper

**Objective:** Upload bill → extract → match → prepare purchase/stock/journal → human approve → domain services post. AI prepares; truth engine posts.

---

## Must-have business coverage

| Area | MVP | Post-MVP deepen |
| ---- | --- | ---------------- |
| Customers / suppliers / products | Yes | — |
| Quotations / invoices / payments | Yes | credit notes, advances as needed (R5) |
| Purchases / expenses / AR / AP | Yes | — |
| Inventory (basic) | Yes | selective (R5) |
| GST-ready + reports | Yes | filing rails later (`future-scope.md`) |
| Accounting truth | Yes | — |
| Cash flow as concept | Partial | R1 / R6 |
| Notifications | In-app | WhatsApp in R4/R5 |
| AI assistance | Thin | R2–R3 |
| Automation | Reminder seed | R4 |
| Insights / attention | Partial | R1–R2 |
| Document intelligence | — | R7 |

### Deliberately do not build (near term)

POS/hardware race, every industry pack, MRP/manufacturing, full payroll, warehouse complexity, report explosion, unrestricted autonomous money movement, competitor feature parity.

---

## Immediate next step

1. Implement Post-MVP specs in order from [`context/feature-specs-post-mvp/`](feature-specs-post-mvp/) starting at `01-typed-domain-events.md`.
2. Do not start R5 specs `12`–`15` before R2–R4 unless progress-tracker records a metric pull.
3. Do not start MVP `29`/`30` until launch readiness (after Post-MVP + future-scope).
4. After R7 (`17-ai-operations-bookkeeper.md`), consult [`context/future-scope.md`](future-scope.md).
