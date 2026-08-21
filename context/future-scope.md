# AI Business OS — Future Scope

**Status:** Deferred reference (after Post-MVP roadmap R1–R7)  
**Active scope:** [`context/product-roadmap.md`](product-roadmap.md)  
**Rule:** Items in this file are **out of Post-MVP R1–R7** unless [`context/progress-tracker.md`](progress-tracker.md) explicitly promotes one with a success metric.

Do not treat this document as the current backlog.

---

## Next north star (post-roadmap)

```text
Roadmap done     → Owner supervises; OS handles routine work
Future           → Help me run / grow the business
```

Once the companion can understand, tell, and safely do routine work, future work expands **reach, compliance depth, growth, and segment fit**—always measured by owner effort and automation rate, not feature count.

---

## Themes (not a commit to build now)

### 1. Distribution and capture

- WhatsApp-native bills, reminders, and approvals (beyond share links)
- Mobile-critical apps (brief, collect, approve, stock check)
- Offline / flaky-net for field billing only if a beachhead segment demands it
- Light POS / barcode / thermal only if counter speed blocks adoption
- Migration: Tally / Vyapar / Excel import so switching is cheap

### 2. India compliance depth

- E-invoice / e-way rails when customers are blocked without them
- GSTR prep packs and reconciliation assists (human or GSP still files)
- Credit/debit note workflows tightened for real audits
- Optional CA workspace: read-only access, exports, period-lock collaboration

Still not: owning government portals or guaranteeing legal filing.

### 3. Smarter operator → limited autopilot

- Richer L4 policies (per customer, category, amount, time-of-day)
- Multi-step playbooks: overdue → remind → escalate → promise-to-pay → next action
- Learning from outcomes (who pays after which tone; dismiss patterns)
- Team: staff executes drafts; owner sets autonomy; accountant reviews

Still out: unrestricted auto-posting of large money; AI rewriting permissions or tax engines.

### 4. Growth and money-in

- Simple online catalog / order link → draft invoice
- Payment collection links (UPI / payment gateway) tied to invoices
- Light offers / follow-ups driven by idle quotations and dormancy (not a full marketing cloud)
- Credit limits / customer risk scores feeding Guardian

### 5. Vertical and scale depth (pull-driven only)

- Batch / expiry (pharma, food)
- Multi-godown / branches
- Job / work-order light manufacturing
- Thin industry packs (e.g. jewellery) as verticals, not a second product

Keep out unless strategy changes: full HRMS/payroll, MRP, multi-country tax, heavy WMS.

### 6. Platform and ecosystem

- Public APIs / webhooks for accountants and integrators
- Partner / CA firm multi-tenant oversight
- Marketplace of approved automations (sandboxed through tools)
- Stronger observability, SLOs, and regional performance past 10k → 100k tenants

---

## Explicit still-out (default)

- Feature parity with Vyapar’s entire catalog
- Replacing CAs or guaranteeing legal filing
- Fully autonomous CFO / L5 unrestricted financial agents
- Rewriting the modular monolith into microservices without proof of need
- Building a proprietary foundation model or vector database as a goal in itself

---

## Horizon sequencing (after R7)

| Horizon | Focus |
| ------- | ----- |
| **Near** | WhatsApp + mobile brief/approve; imports; e-invoice when blocked |
| **Mid** | Autopilot playbooks + outcome learning; UPI collect-on-invoice |
| **Later** | Vertical depth + partner/CA platform |

---

## Promotion rule

To move an item from this file into active work:

1. Name the metric it improves (owner effort, collections speed, compliance unblock, automation rate).
2. Record the decision in `progress-tracker.md`.
3. Add or update a feature spec — do not implement from this file alone.
