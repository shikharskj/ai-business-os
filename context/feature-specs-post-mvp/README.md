# Post-MVP Feature Specs

Numbered files in this folder are the **execution order** for Post-MVP implementation.

MVP archive (complete): [`context/feature-specs-mvp/`](../feature-specs-mvp/).  
Product sequencing: [`context/product-roadmap.md`](../product-roadmap.md).  
Deferred after Post-MVP: [`context/future-scope.md`](../future-scope.md).

```text
Read AGENTS.md and context files (including product-roadmap.md)
      ↓
Mark the current spec In Progress in progress-tracker.md
      ↓
Implement exactly one spec from this folder
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
* Do **not** implement items from `future-scope.md` unless progress-tracker promotes them with a metric.
* Specs `12`–`15` (R5 coverage) are written fully but **implement after `05`–`11` (R2–R4)** unless progress-tracker records an explicit pull with a metric.
* MVP automated testing (`29`) and production hardening (`30`) are **deferred until launch** — after Post-MVP and future-scope work, not parallel to R1–R7.
* Specs are implementation briefs. Architecture, UI, and coding rules live in the context files — follow those pointers instead of inventing behavior.
* Do **not** silently reverse Accepted decisions in `progress-tracker.md` or `product-roadmap.md`.

## Accepted product decisions (Post-MVP)

| Area | Decision | Why |
| ---- | -------- | --- |
| Truth engine | Frozen posting / tax / money pipelines — extend via events/tools | Avoid rewrite while adding intelligence |
| Projections | Derived, rebuildable; never money source of truth | Deterministic books |
| Autonomy | L0–L4 only; L5 forbidden | Safety |
| GST | GST-ready, not filing / e-invoice portal | Scope control |
| R5 delivery | Share / deep-link / in-app — not WhatsApp Business API | WhatsApp stays future-scope |
| Inventory depth | No barcode/batch/multi-location in this catalog | Future-scope unless pulled |
| Launch trust | Specs `29`/`30` (MVP folder) after Post-MVP + future-scope | Launch readiness, not early parallel |

## Spec template

Every spec uses this shape:

1. Read `AGENTS.md` and context files. Mark this spec In Progress before coding.
2. One-sentence objective.
3. **Depends on**
4. **Scope**
5. **Do not**
6. **Follow**
7. **Open questions** / **Decided**
8. **Check when done**

## Catalog

| Spec | Unit | Roadmap | Status |
| ---- | ---- | ------- | ------ |
| 01 | Typed domain event catalog + outbox consumer registry | R1 | Complete |
| 02 | BusinessState projections + rebuild | R1 | Complete |
| 03 | Cash position model (ledger cash/bank) | R1 | Complete |
| 04 | AttentionQueue + minimal outcome hooks | R1 | Not Started |
| 05 | Needs attention / Daily Brief UI (deterministic) | R2 | Not Started |
| 06 | Operator recommendations (L0–L2) on brief | R2 | Not Started |
| 07 | Copilot context from BusinessState + why/what-next | R3 | Not Started |
| 08 | Autonomy policy model (tenant L0–L4 config) | R4 | Not Started |
| 09 | Automation runtime (event→condition→action→outcome) | R4 | Not Started |
| 10 | Collections automation vertical | R4 | Not Started |
| 11 | Quotation follow-up + reorder prepare + expense anomaly | R4 | Not Started |
| 12 | Credit notes / returns | R5 | Not Started *(after R2–R4 unless pulled)* |
| 13 | Advances / retainers | R5 | Not Started *(after R2–R4 unless pulled)* |
| 14 | Sales orders | R5 | Not Started *(after R2–R4 unless pulled)* |
| 15 | Reminder/invoice share delivery (non-WhatsApp) | R5 | Not Started *(after R2–R4 unless pulled)* |
| 16 | Business Guardian | R6 | Not Started |
| 17 | AI Operations / document → prepared purchase | R7 | Not Started |

**Next implementable spec:** `04-attention-queue.md`
