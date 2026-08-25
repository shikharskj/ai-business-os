# AI Business OS — Progress Tracker

Update this file after **every meaningful implementation change**.

This file is the **single source of truth for implementation progress**. The AI developer must read it before starting work and update it after completing each meaningful unit.

---

## Current Phase

* **Phase:** Post-MVP — R5 Coverage Completers
* **Status:** Next — `15-share-delivery.md`
* **Active roadmap:** [`context/product-roadmap.md`](product-roadmap.md)
* **Active specs:** [`context/feature-specs-post-mvp/`](feature-specs-post-mvp/) — next: `15-share-delivery.md`
* **MVP archive:** [`context/feature-specs-mvp/`](feature-specs-mvp/)
* **Deferred horizon:** [`context/future-scope.md`](future-scope.md) (do not schedule as current Next)
* **Launch trust:** MVP `29` / `30` deferred until after Post-MVP + future-scope (not parallel)

---

## Current Goal

Ship the Post-MVP companion OS on the completed MVP system of record by implementing **one Post-MVP feature spec at a time**:

```text
Understand the business (R1) — specs 01–04
      ↓
Tell what matters (R2) — specs 05–06
      ↓
Ask why / what next (R3) — spec 07
      ↓
Automate routine work (R4) — specs 08–11
      ↓
Selective coverage (R5) — specs 12–15 (after R2–R4 unless pulled)
      ↓
Guardian (R6) → AI Ops (R7) — specs 16–17
```

North star: an AI-native OS for Indian SMEs that records correctly, understands continuously, tells the owner what matters, and automates routine work under autonomy L0–L4.

**Current implementation unit:** `context/feature-specs-post-mvp/15-share-delivery.md`.

**R5:** Specs `12`–`14` are complete. Specs `05`–`11` (R2–R4) are complete. Do not start MVP `29`/`30` until launch readiness.

The priority is **correctness, attention quality, and automation under guardrails** — not feature parity with billing ERPs.

---

# Post-MVP Development Priorities

Work in this order (see `product-roadmap.md`):

1. Intelligence Spine (R1) — post-MVP specs `01`–`04`
2. Operator / Daily Brief (R2) — specs `05`–`06`
3. Copilot depth (R3) — spec `07`
4. Automation Engine (R4) — specs `08`–`11` (collections first)
5. Coverage completers (R5) — specs `12`–`15` (after R2–R4 unless pulled)
6. Business Guardian (R6) — spec `16`
7. AI Operations / Bookkeeper (R7) — spec `17`
8. Launch only: MVP `29` automated testing and `30` production hardening (after Post-MVP + future-scope)

Do not pull items from `future-scope.md` into this list without an explicit progress-tracker promotion and metric.

Catalog: [`context/feature-specs-post-mvp/README.md`](feature-specs-post-mvp/README.md). Historical MVP: [`context/feature-specs-mvp/`](feature-specs-mvp/).

---

# Current Goal Status

| Area                  | Status      |
| --------------------- | ----------- |
| Project setup         | Complete    |
| Design system         | Complete    |
| Authentication        | Complete    |
| Business setup        | Complete    |
| Multi-tenancy         | Complete    |
| Database              | In Progress |
| Customers             | Complete    |
| Products              | Complete    |
| Inventory             | Complete    |
| Sales                 | Complete    |
| Invoices              | Complete    |
| Payments              | Complete    |
| Expenses              | Complete    |
| Suppliers             | Complete    |
| Purchases             | Complete    |
| Accounting            | Complete    |
| GST                   | Complete    |
| Dashboard             | Complete    |
| Reports               | Complete    |
| Search                | Complete    |
| AI Assistant (thin)   | Complete    |
| Notifications         | Complete    |
| Testing (`29`)        | Deferred until launch |
| Security hardening (`30`) | Deferred until launch |
| Production deployment | Not Started |
| Intelligence Spine (R1) | Complete (`04`) |
| Operator / Daily Brief (R2) | Complete (`05`–`06`) |
| Copilot Depth (R3)    | Complete (`07`) |
| Automation Engine (R4)| Complete (`08`–`11`) |
| Coverage Completers (R5) | In Progress (`15`) |
| Business Guardian (R6)| Not Started |
| AI Operations (R7)    | Not Started |

---

# Completed

* **Local volume seed script (dev tooling):**
  * `npm run db:seed:volume` — seeds one business with `SEED-` customers/products/quotations/invoices plus sales orders, credit notes, customer payments, suppliers, bills, purchase returns, and supplier payments via domain use cases. Fill-gaps mode skips entity types that already have SEED-* rows. Abort if production. Optional `SEED_TENANT_ID`. Reset with `npx tsx scripts/cleanup-seed-volume.ts`. Not a roadmap feature.

* **Sales orders (`14-sales-orders.md`):**
  * Optional sales order between quotation and invoice: DRAFT → CONFIRMED | CANCELLED; CONFIRMED → FULFILLED | CANCELLED. Numbering `SO/FY…`. Create directly or convert ACCEPTED quotation → CONFIRMED order (quotation → CONVERTED). Convert CONFIRMED order → draft invoice (order → FULFILLED). Double-convert rejected.
  * Confirming an order does **not** move stock or post accounts; invoice post remains the stock/accounting boundary. Permissions reuse `quotation:*` and `invoice:create`. No PDF, no new permission names, no MRP/ATP.
  * Outbox: `SalesOrderCreated` / `Updated` / `Confirmed` / `Cancelled` / `Fulfilled` (attention hook; not cash). Search type `sales_order`. Nav: Sales → Orders.
  * UI: list/new/detail/edit; Create order from accepted quotation; Convert to invoice on confirmed order; customer hub recent orders; invoice/quotation cross-links.
  * Migration `20260823010000_add_sales_orders`. Tests: `tests/sales/sales-orders.test.ts`. Typecheck and production build succeed. Next: `15-share-delivery.md`.

* **Advances / retainers (`13-advances-retainers.md`):**
  * Customer receipts may leave an unallocated remainder (or be recorded with no invoices). Same cash/bank journal as a normal receipt (`PaymentReceived`). Remainder is customer credit.
  * Apply credit to one or more invoices from the receipt or FIFO across the customer’s unallocated receipts. No second cash journal. Over-application against credit or invoice outstanding is rejected. Outbox `AdvanceApplied` refreshes receivables/attention, not cash.
  * Permissions reuse `payment:*`. UI: Record advance (`/app/sales/payments/new?advance=1`); leftover on Record payment; Apply credit on payment and invoice detail; customer hub shows credit. Supplier advances not in this spec (optional).
  * Tests: `tests/payments/advances.test.ts`. Typecheck and production build succeed. Next: `14-sales-orders.md`.

* **Dashboard Sales vs expenses default range:**
  * Omitted/`?range=` default is `last_7_days` (was `last_3_months`); invalid filter fallback matches. Chart segmented control still offers 7 / 30 / 3 months.

* **Credit notes / returns (`12-credit-notes-returns.md`):**
  * Sales credit notes against a posted invoice: DRAFT → POSTED/CANCELLED, `CN/FY…` numbering, tax engine (`SALE`), qty capped at remaining invoice-line quantity, journal reverse of sales (Dr Sales/Output GST, Cr AR) plus Dr Inventory / Cr COGS on returned stock (`RETURN` / `CreditNote`). Outstanding = `grandTotal − payments − posted credits`, clamped at 0.
  * Purchase returns against a posted bill: `PR/FY…` numbering, tax engine (`PURCHASE`), same qty cap, journal reverse of purchase (Dr AP, Cr Inventory/Expense, Cr Input GST), stock OUT `RETURN` / `PurchaseReturn`.
  * Permissions reuse `invoice:*` and `purchase:*`. GST summary nets `SALES_CREDIT_NOTE` (negated output) and `PURCHASE_RETURN` (negated input). Sales report, dashboard, receivables/payables, and search include both. Outbox `CreditNotePosted` / `Cancelled` and `PurchaseReturnPosted` / `Cancelled`.
  * UI: Sales → Credit notes and Purchases → Returns (list/new/detail/edit); Issue credit note / Issue return from posted invoice/bill. No PDF, no new permission names, no e-invoice/GSTR.
  * Migration `20260822200000_add_credit_notes_and_purchase_returns`. Tests: `tests/sales/credit-notes.test.ts`, `tests/purchases/purchase-returns.test.ts`. Typecheck and production build succeed. Next: `13-advances-retainers.md`.

* **Entity create + return-to-form:**
  * `lib/navigation/entity-create-return.ts` — allowlisted `returnTo`, href/redirect builders, initial entity id helpers.
  * Create customer/product/supplier actions redirect back to originating form when `returnTo` is valid; pre-select via query params; `entityCreated` flash toast on form pages.
  * Inline **+ New customer/product/supplier** on record payment, supplier payment, bill, invoice, and quotation forms; empty-state page buttons wired with `returnTo`.
  * Tests: `tests/navigation/entity-create-return.test.ts`, `tests/feedback/flash-toast-map.test.ts`.

* **Skeleton layout fidelity:**
  * Shared primitives in `components/shell/page-skeletons/shared.tsx`: `PageHeaderSkeleton` (`showDescriptionEnd`, `actionCount`), `ListFilterFormSkeleton`, `DataTableSkeleton`, `NativeTableSkeleton`.
  * Dashboard skeleton mirrors `DashboardCanvas` (`lg:grid-cols-3`, 4 KPI cards `min-h-36`, chart card, daily brief + activity rail).
  * `list-table-presets.ts` + preset props on list-table skeleton components; 13 workspace list routes wired to matching presets.
  * Tests: `tests/shell/skeleton-structure.test.ts`. Docs: Loading skeleton fidelity note in `context/ui-context.md`.

* **Smart Form Fields UX:**
  * `lib/geo/` — GST-aligned state list, curated cities, bundled PIN index, `lookupPincode` with `none` / `suggest` / `unique` safety rules; optional India Post API fallback (`NEXT_PUBLIC_PIN_LOOKUP_API_ENABLED`).
  * `FormCombobox` — hidden `name` input for server actions, creatable custom values for city.
  * `IndianAddressFields` + `PartyGstFields` — PIN-first layout, inter-linked city/state, GSTIN uppercase + state suggest chip; wired into customer and business profile forms.
  * Full placeholder pass via `lib/forms/placeholders.ts` across product, invoice, quotation, bill, payment, expense, and party forms.
  * Safe smart defaults: place-of-supply lock on invoice/quotation when manually edited; “Fill outstanding” button on payment forms (no auto-fill on invoice/bill preselect).
  * Soft 6-digit PIN validation on party schema. Tests: `tests/geo/*.test.ts`.

* **UX feedback system (loading, spinners, toasts):**
  * Mounted `AppFeedbackProvider` + semantic toast variants (`success` / `warning` / `error` / neutral `info`) in workspace layout. Helpers: `lib/feedback/toast.ts`, `lib/feedback/flash-toast-map.ts`, `FlashToastHandler` for redirect query params (`saved`, `created`, `invited`, `closed`, etc.).
  * Shared `SubmitButton` / `PendingButton` with inline spinners; migrated all business forms and status-action components. Status actions use `router.refresh()` + success/error toasts instead of full page reload.
  * ~15 reusable page skeleton templates + 55 route-level `loading.tsx` files mirroring list/detail/form/report/settings layouts.
  * Removed inline `?saved=` / `?invited=` / `?closed=` banners from detail and settings pages (toasts replace them). Create-flow redirects now append `?created=1`.
  * Tests: `tests/feedback/flash-toast-map.test.ts`, `tests/feedback/submit-button.test.ts`, `tests/shell/page-skeleton-map.test.ts`. Next: `16-business-guardian.md` (unchanged).

* **R4 follow-up fixes:** Autonomy form save preserves `disabledAutomations`. Invoice `due=OVERDUE` requires outstanding > 0. Collections L4 zero-send messages follow reminder status (`not_found` / `not_overdue` / `failed` / `already_sent`). Unconfirmed cron prepares no longer record `REMINDER_PROPOSED`.

* **Automation expansions (`11-automation-expansions.md`):**
  * Three thin automations on the spec `09` runtime: `quotations.followup` (`QuotationIdle` → in-app follow-up draft, no email), `inventory.reorder` (velocity stub → draft purchase inputs, never posts), `expenses.anomaly` (`ExpenseRecorded` → inform/recommend when already on the queue). All three are `mode: "dry_run"`; L4 money-post classes stay off.
  * AttentionQueue adds `UNUSUAL_EXPENSE` (same-category amount vs recent average). Daily Brief shows Inform / Follow up / Reorder + L2 Prepare purchase (`purchase:create`, navigate only). Outcomes: `QUOTATION_FOLLOW_UP_PROPOSED`, `REORDER_PREPARED`, `EXPENSE_ANOMALY_FLAGGED`.
  * Tests: `tests/workflows/automation-expansions.test.ts`. Typecheck and production build succeed. Next: `16-business-guardian.md` (R5 `12`–`15` only if pulled).

* **Collections automation (`10-collections-automation.md`):**
  * First vertical on the spec `09` runtime: `collections.remind` (`InvoiceOverdue` → rank by amount/days overdue → draft via `previewAiAction` → L4 `executeAiTool` send or L3 prepare when policy is off / over ceiling).
  * Scheduled overdue scan emits `InvoiceOverdue` catalog events and enqueues runs. Daily idempotency keys plus a 7-day `REMINDER_SENT` cooldown prevent reminder spam. Delivery stays in-app (`send_payment_reminders`).
  * Outcomes stay queryable: `listCollectionsOutcomes` and `GET /api/business-state/outcomes` (`report:read`) for `REMINDER_PROPOSED` / `REMINDER_SENT` / `PAID_AFTER_REMINDER`. Cron L3 prepares do not record `REMINDER_PROPOSED`; that kind is written on confirmed send (chat/HMAC or L4 `send_payment_reminders`). Daily Brief Prepare is unchanged.
  * Tests: `tests/workflows/collections-automation.test.ts`. Typecheck passes. Next: `11-automation-expansions.md`.

* **Automation runtime (`09-automation-runtime.md`):**
  * `modules/workflows/` runner: EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME. Outbox `automation` consumer enqueues `workflow_runs`; `processDueWorkflowRuns` claims jobs with tenant concurrency keys, retries/backoff, and dead-letter. Idempotent on `(tenantId, workflowId:eventId)`.
  * Mutating `mode: "execute"` is L4-only and fail-closed via `evaluateL4Autonomy` before `action`. The runner does not post journals or stock. `proof.noop` is the dry-run proof on `AttentionDismissed`. `registerWorkflow` is the collections plugin point (spec `10`).
  * Outcome kinds `AUTOMATION_SUCCEEDED` / `FAILED` / `SKIPPED`. Metrics stubs for success/fail/skip. Owner Settings lists recent runs.
  * Tests: `tests/workflows/automation-runtime.test.ts`. Production build succeeds. Next: `10-collections-automation.md`.

* **Autonomy policy (`08-autonomy-policy.md`):**
  * Per-tenant `TenantAutonomyPolicy` (missing row = L4 off / empty allow-list): `allowedActionClasses`, `amountThresholds`, `requireConfirmationAbove`, `disabledAutomations`. Migration `20260822120000_add_tenant_autonomy_policy`.
  * Owner/admin Settings → Autonomy enables L4 payment reminders under an amount ceiling. Policy changes are audited (`autonomy.policy.updated`). Invoice posting is not an allowed L4 class. L5 is not representable.
  * Tools declare `autonomyLevel`. `send_payment_reminders` is L3 + `payment_reminder`. `executeAiTool` allows L4 only when a trusted caller sets `autonomyAttempt: "L4"` and `evaluateL4Autonomy` passes. Chat/HMAC confirm path unchanged.
  * Tests: `tests/tenant/autonomy-policy.test.ts`, `tests/ai/autonomy-policy.test.ts`. Production build succeeds. Next: `09-automation-runtime.md`.

* **Settings UX polish:**
  * Main settings gated on `settings:read`; writes stay on `settings:update`. Staff/Accountant get read-only profile, logo preview, and autonomy display.
  * Two-column `/app/settings` layout: business profile primary (left), logo + autonomy + recent automations (right).
  * Members page: current members table, pending Clerk invitations, OWNER role assignment via existing action, invite form for `settings:update`.
  * Automation run rows link to `/app/settings/automations/:id` with related-record href when permitted.
  * Tests: `tests/tenant/list-organization-members.test.ts`, `tests/workflows/workflow-run-detail.test.ts`.
  * Next: `16-business-guardian.md` (unchanged).

* **Sidebar navigation cleanup:**
  * Shared nav tree in `components/shell/workspace-nav.ts` — permission-filtered leaves, used by sidebar and command menu.
  * Sales / Purchases / Inventory / Accounting / Reports are collapsible toggles (not routes). Accounting, Reports, Settings default collapsed; Sales / Purchases / Inventory default open; toggles persist in `localStorage`.
  * Settings links to `/app/settings` with nested Members / Documents. Search removed from sidebar (`⌘K` only). Ledger and Trial balance under Accounting only.
  * Hub URLs redirect (`/app/sales` → invoices, etc.). Removed Back-to-hub buttons on accounting/report list pages.
  * Tests: `tests/shell/workspace-nav.test.ts`. Next: `16-business-guardian.md` (unchanged).

* **Sales UX polish (operator pass — invoices, quotations, customers, payments):**
  * Shared primitives: `formatDisplayDate` on sales tables, ISO-controlled `DatePicker`, searchable `Combobox` for customer/product selects, GST breakdown hides zero CGST/SGST/IGST lines, list filter **Clear** link.
  * Invoice list: derived outstanding + due date, single payment-facing status badge, customer links, `due=OVERDUE` filter, overdue due-date tone, reorder disabled on transactional lists.
  * Invoice/quotation detail: overdue copy, GST rate on lines, primary action + overflow menu (Cancel/PDF), non-draft edit redirects to detail with `?locked=1`; forms use searchable selects, DatePicker, pre-GST line subtotal labels.
  * Customer hub: outstanding card, related invoices/quotations/payments (capped + View all), New invoice / Record payment actions, reactivate inactive customers (`CustomerReactivated` event).
  * Payments polish + `/app/sales` directory (open receivables when `invoice:read`) + command menu entries for quotations/payments.
  * Tests: overdue/outstanding list filters, customer reactivate/inactive-update guard. Does **not** complete R4 spec `10`.
  * Next: `16-business-guardian.md` (unchanged).

* **Copilot depth (`07-copilot-depth.md`):**
  * Chat context assembly order: system policy → trusted identity note (no tenant/user/role ids) → fenced BusinessState/Attention summary (counts/titles only, `report:read`) → tools → sanitized conversation. Chat route still has no Prisma.
  * `explain_period_movement` composes dashboard + sales/expense reports into application-computed current vs previous deltas for diagnostic “why” questions. Model must not subtract periods.
  * Assistant Trust UI labels Verified / Analysis / Recommend. Overdue and period-movement answers can offer Prepare reminder, signed through the existing confirm-token path (same as Daily Brief). ACCOUNTANT/STAFF still cannot confirm without `invoice:update`.
  * Tests: `tests/ai/copilot-depth.test.ts`, previous-range coverage in `tests/reporting/dashboard.test.ts`. Production build succeeds. Next: `08-autonomy-policy.md`.

* **Document preview + logo export fixes:** WebP logos convert to PNG for invoice/quotation PDF embed (`logoBufferForPdf`) so export matches the HTML preview. Preview asides are `w-full` below `lg` with A4-scaled width from a CSS variable (no inline `width`). Logo upload/remove revalidates invoice and quotation layouts. Tests: `tests/sales/pdf-logo.test.ts`. Next remains `07-copilot-depth.md`.

* **Needs attention prepare + confirm recovery:** Overdue Prepare reminder is omitted unless the member has `invoice:update` (dashboard is `report:read`; ACCOUNTANT no longer sees a control that 403s). Failed confirm keeps the pending card with Try again / Cancel and leaves View / Dismiss on the row so `router.refresh()` client state cannot trap the item. Tests: `tests/business-state/daily-brief.test.ts`. Next remains `07-copilot-depth.md`.

* **Tax invoice theme alignment:** Live preview uses semantic tokens (`card` / `foreground` / `muted-foreground` / `border` / `primary` lettermark square). PDF export mirrors the same layout via light paper palette in `invoice-document-theme.ts` (always light for print). Stronger totals row; party hairline dividers. Tests: `tests/sales/invoice-document.test.ts`. Next remains `07-copilot-depth.md`.

* **Invoice detail polish:** Responsive sticky tax-invoice preview (~47% scale, 15% shorter than prior preview) with Activity timeline underneath; Details + GST before Lines; Payments always shown (empty state + Record payment); allocated/outstanding + View journal (`report:read`); customer link; `formatDisplayDate` on business dates. Shared `EntityActivityPanel` (vertical rail timeline) + `AuditRepository.listForResource` for invoice.* audit events. Tests: `tests/shared-kernel/audit.test.ts`, `tests/shared-kernel/entity-activity-label.test.ts`. Next remains `07-copilot-depth.md`.

* **GST tax invoice preview + PDF:** Create/edit invoices show a live A4 Tax Invoice (logo or letter-mark, billed by/to, HSN lines, GST totals). Export uses the same `InvoiceDocumentView`; pdfkit draws the PDF from tax-engine amounts (`previewInvoice` / posted invoice). UI previews use `InvoiceDocumentPreview` at ~47% scale. Business logo upload on Settings (`logoDocumentId`, JPEG/PNG/WebP). Image documents download `inline`. Invoice status actions import `isPostedInvoiceStatus` from domain (not the sales barrel) so pdfkit/`fs` stay server-only. Tests: `tests/sales/invoice-document.test.ts`, `tests/tenant/business-logo.test.ts`, `tests/shared-kernel/amount-in-words.test.ts`.
* **GST quotation document parity:** `buildQuotationDocumentView`, `QuotationDocumentPreview`, and `renderQuotationPdfBytes` mirror the invoice stack (title QUOTATION, valid until, quoted by/to). Live preview on create/edit/view; PDF export gated to SENT/ACCEPTED via `exportQuotationPdf` (`ownerRecordType: QUOTATION`). Quotation detail layout matches invoice (GST + Details, lines, sticky preview, activity timeline with quotation.* audit labels). Tests: `tests/sales/quotation-document.test.ts`. Next remains `07-copilot-depth.md`.

* **Fixed top bar + canvas spacing:** Workspace shell is `h-svh` with scroll only in `main` so the app top bar stays fixed; page headers scroll with content. Doubled `/app` canvas gaps (`gap-8` / `lg:gap-12`, outer `gap-12`). Next remains `07-copilot-depth.md`.

* **Needs attention + Recent activity typography:** Bumped Daily Brief and activity rail copy off `text-[10px]` / dense `text-xs` / `size="xs"` onto workspace hierarchy (`text-base` titles/amounts, `text-sm`–`text-base` body, `text-xs` cues only, `sm` buttons / default badges). Shared `PendingActionCard` cues/fields matched. Dashboard period meta sits on the PageHeader description row via `descriptionEnd` (right-aligned with “Overview of …”, `text-base`). Brief greeting personalizes with Clerk first name + smile (`Good morning, Name 🙂`). Next remains `07-copilot-depth.md`.

* **Dashboard brief height polish:** Needs attention is content-sized beside KPIs (`lg:self-start`; no `h-full` / `min-h-48` on the brief card). Period notes + queue scroll under a fixed header (`max-h-[min(28rem,50vh)]`). Recent activity still stretches to the chart. Next remains `07-copilot-depth.md`.

* **Operator recommendations (`06-operator-recommendations.md`):**
  * Deterministic L1/L2 on Needs attention rows: overdue → Remind customer + Prepare reminder (Prepare only with `invoice:update`); low stock → Review stock; idle quote → Follow up. Quiet autonomy cues (Recommend / Prepare / Confirm).
  * `POST /api/assistant/actions/propose` (`invoice:update`) builds HMAC-signed `send_payment_reminders` pending action from an overdue AttentionQueue row; confirm still uses existing `/api/assistant/actions/confirm`. Shared `PendingActionCard`.
  * Dashboard polish: show-more after 5 rows; header counts from visible (non-dismissed) rows; yesterday vs KPI range cue; `ensureAttentionQueueFresh` rebuilds when `rebuiltAt` older than 6h; supervisor `insights` region left empty (brief owns notes/queue).
  * Tests: `tests/business-state/daily-brief.test.ts`, `propose-brief-reminder.test.ts`, attention ensure-fresh TTL, dashboard-supervisor empty insights. Next: `07-copilot-depth.md`.

* **Daily Brief UI (`05-daily-brief-ui.md`):**
  * `/app` Needs attention rail (mobile-first) from AttentionQueue + yesterday sales / cash-in / expenses via `getPeriodActivity` (same taxable/receipts/expense basis as dashboard KPIs — no client money math).
  * Each row: type badge, title, body, verified amount fact when present, link to the domain record, Dismiss → `POST /api/business-state/attention/dismiss`.
  * When the dashboard supervisor is `fallback` (AI down), the brief still renders the same rows with quieter copy (no greeting). Not a second chatbot.
  * Follow-up coverage: first `/app` visit runs `ensureAttentionQueueFresh` when `meta.rebuiltAt` is null so existing low stock / overdue / idle quotes backfill; low-stock threshold changes rebuild `attentionQueue` + `inventoryRisk` from `updateBusinessProfileAction`. Brief chrome shows queue type counts plus L0 period notes (negative profit / high expense ratio / payables-heavy) from supervisor overview — Alerts rail not restored.
  * Tests: `tests/business-state/daily-brief.test.ts`, `tests/business-state/attention-queue.test.ts` (ensure-fresh), `tests/reporting/dashboard.test.ts` (period activity day isolation).

* **Attention queue (`04-attention-queue.md`):**
  * Tenant-scoped `AttentionItem` projection (overdue receivable, low stock, idle SENT/ACCEPTED quotation) with ranked severity, href, optional money fact, OPEN/DISMISSED. Migration `20260822060000_add_attention_queue`.
  * Rebuild from domain truth (`rebuildBusinessStateProjections` family `attentionQueue`); outbox consumer + scheduled overdue scan refresh the queue. Dismiss is preserved across rebuilds; resolved issues drop so a later recurrence can surface.
  * APIs: `GET /api/business-state/attention` (open, ranked) and `POST /api/business-state/attention/dismiss` (idempotent). Authz `report:read`. Dismiss emits `AttentionDismissed` and does not mutate invoices or stock. `GET /api/business-state` includes `attention.openCount`.
  * Outcome hooks (`AutomationOutcome` + `AutomationOutcomeRecorded`): `ATTENTION_DISMISSED`, `REMINDER_PROPOSED` / `REMINDER_SENT` from confirmed payment reminders, `PAID_AFTER_REMINDER` when a reminded invoice is paid. `REMINDER_SENT` is recorded only when `delivered === true`; `already_sent` still records `REMINDER_PROPOSED`. Outbox payloads omit null/undefined fields so `toPrismaJson` can persist `AutomationOutcomeRecorded`.
  * Tests: `tests/business-state/attention-queue.test.ts`. Next: `05-daily-brief-ui.md`.

* **Cash position model (`03-cash-position-model.md`):**
  * Cash = ledger balances of designated COA accounts Cash (`1000`) and Bank (`1010`). Payment methods map on posting: CASH → Cash; UPI / bank transfer / card / cheque → Bank.
  * `CashPosition` BusinessState projection (migration `20260821220000_add_cash_position_state`); rebuild from journals; outbox events `PaymentReceived`, `PaymentMade`, `ExpenseRecorded`, `JournalPosted`, `JournalReversed`.
  * Authz read APIs: `GET /api/business-state/cash` (live ledger query with currency, scale, fact ids) and `GET /api/business-state` (includes projection). `report:read`.
  * AI tool `get_cash_position` uses the same `getCashPosition` query — no invoice-table cash heuristic. System policy forbids inventing cash from unpaid invoices.
  * Tests: `tests/business-state/cash-position.test.ts` (receipt moves cash, invoices do not, rebuild matches ledger, outbox, tool facts; non-INR tenant with only Cash or only Bank activity; non-2-decimal currency; tenant-configured account names).
  * Ledger totals for cash position are tagged with the tenant currency and the ledger line scale (`accountTotals` + `computeCashPosition`) so an inactive Cash/Bank zero does not currency- or scale-mismatch a live total.
  * Prisma BusinessState writes apply `computedAt` atomically (`updateMany` where older, else `createMany` with `skipDuplicates`; retry guarded update if the insert was skipped). Do not `create` + catch unique conflicts inside `$transaction` — PostgreSQL aborts the transaction (25P02) and later families / `writeMeta` cannot commit.
  * Cash-position projection persists tenant Cash/Bank account names (`cashAccountName` / `bankAccountName`) instead of reconstructing from the MVP chart template.
  * Next: `04-attention-queue.md`.

* **BusinessState projections (`02-business-state-projections.md`):**
  * `modules/business-state/` — ReceivablesRisk, InventoryRisk, SalesMomentum (30-day posted invoice rollup) + `BusinessStateMeta` envelope; Prisma migration `20260821120000_add_business_state_projections`.
  * Rebuild from domain truth (`rebuildBusinessStateProjections`); outbox consumer `business-state` replaces projection-stub in default registration.
  * Write hardening: outbox page coalesce via `handleBatch`, `computedAt` guards, atomic `commitSnapshots` (+ meta). Family upserts inside the transaction use `createMany`/`skipDuplicates` (catching unique conflicts would abort PostgreSQL). Prisma coverage: `tests/business-state/prisma-projections.integration.test.ts`.
  * Read/rebuild APIs: `GET /api/business-state`, `POST /api/business-state/rebuild` (`report:read`).
  * Cron / `after()` wire `createPrismaBusinessStateConsumerDeps`; tests in `tests/business-state/projections.test.ts`.
  * Next: `03-cash-position-model.md`.

* **Typed domain events (`01-typed-domain-events.md`):**
  * `modules/events/` — typed catalog (`DOMAIN_EVENT_TYPES` + Zod payload schemas), consumer registry, `processOutboxConsumers` / `runOutboxProcessing`, `persistDomainEvent`.
  * Per-consumer `OutboxConsumerReceipt` (migration `20260821100000_add_outbox_consumer_receipts`) with backfill for legacy `processedAt` notifications receipts.
  * Built-in consumers: `notifications` + `projection-stub` (proves multi-consumer fan-out; real projections in `02`).
  * Cron `/api/internal/outbox/process` and `scheduleNotificationOutboxProcessing` use registry fan-out; failures leave no receipt (retry); notification idempotency keys unchanged.
  * Key emitters use `persistDomainEvent` (invoice posted, payment received, purchase posted, expense, inventory, quotation transitions).
  * Tests: `tests/events/domain-events.test.ts`; notifications regression green.
  * Next: `02-business-state-projections.md`.

* **Product direction locked (docs):** Post-MVP roadmap + future scope + context architecture updates. Feature specs catalog: `feature-specs-post-mvp/` (`01`–`17`). MVP archive: `feature-specs-mvp/`. Specs `29`/`30` deferred until launch.
* **Post-MVP feature specs catalog created:** `context/feature-specs-post-mvp/` README + specs `01`–`17`; pointers synced in product-roadmap, progress-tracker, feature-specs-mvp README, AGENTS, ai-workflow-rules.

* AI Assistant (`28-ai-assistant.md`) — sheet-only + AI SDK transport:
  * Top-bar sheet is the only entry point (`/app/assistant` permanently redirects to `/app`). Custom `complete()` adapters and `runAiAssistant` were removed; Gemini streams via `@ai-sdk/google` + `streamText` / `useChat`.
  * Sheet UX polish: `bg-sidebar` + ~42rem width, tool-activity timeline, lead-bold prose + lists (no raw `* **`), fact card/table, animated empty welcome.
  * Facts vs opinion is structural: `factsFromToolResult` builds fact cards from schema-validated tool output only; the stream emits them as typed data parts. Model prose never becomes verified figures.
  * Confirmation gate: `send_payment_reminders` is previewed but never executed during a chat turn. `/api/assistant/actions/confirm` verifies an HMAC token, then `executeAiTool` re-checks identity, permission, and schema before running and audits it.
  * Chat routes reach data through tools only (no Prisma import); SDK confined to route + `lib/ai` bridge + client hooks; provider outages become a contained assistant error state.
  * Tests: `tests/ai/ai-assistant.test.ts`, `ai-gateway.test.ts`, `ai-safety.test.ts` (tools/confirm/facts, config, no SDK in `modules/ai`).
  * Hardening: SDK tool results fenced with `UNTRUSTED-CONTENT`; client history sanitized to user/assistant text only; second confirmation proposals rejected; stub mode requires tenant context; overdue metrics facts no longer mix low-stock copy. Follow-up: app-relative href schema, derived action signing secret, `@/modules/ai/server` barrel split, currency-aware receivables zeros, resilient reminder delivery, isolated audit writes, Zod chat message limits, confirm outcome safeParse.
  * Review fixes: skip non-array chat `parts` without throwing; action tools append `started` then success/failed audit (no silent success without audit); payment-reminder `failedCount` separate from `skippedCount`.

* Notifications (`26-notifications.md`):
  * `modules/notifications/` — in-app channel abstraction (email/SMS/WhatsApp later), idempotent outbox consumer, overdue scheduled check, mark read/unread. Tenant-scoped `Notification` table with unique `(tenantId, idempotencyKey)`.
  * Top-bar inbox (`NotificationInbox`) wired to `/api/notifications` + mark-read. Post-commit kick via Next.js `after()`; cron entry at `/api/internal/outbox/process`.
  * Inbox polish: relative timestamps, type severity badge/accent, numeric unread badge, optimistic mark-read, focus/visibility refetch, clearer empty copy.
  * Events: invoice created/posted, payment received, low stock after inventory movements, invoice overdue (scheduled).
  * Tests: `tests/notifications/notifications.test.ts` (idempotency, tenant isolation, overdue, low stock); `tests/shared-kernel/format-relative-time.test.ts`.

* Search (`25-search.md`):
  * `modules/search/` — tenant-scoped PostgreSQL FTS (`to_tsvector` / `to_tsquery`) over customers, suppliers, products, invoices, purchases, payments, supplier payments, expenses. Permission-gated by existing `*:read` permissions. Derived GIN indexes via migration (no Elasticsearch).
  * Top-bar ⌘K search wired to `/api/search`; full page at `/app/search` with type / status / date filters. Empty and no-match states handled.
  * Tests: `tests/search/search.test.ts` (tenant isolation, type filter, empty results).

* Reports (`24-reports.md`):
  * `modules/reporting/` business report use cases — sales, expenses, profit, receivables, payables, inventory — plus CSV helpers. GST (`22`) and ledger/trial balance (`21` via `getLedger` / `getTrialBalance`) reused under `/app/reports`.
  * Reports hub + nested sidebar; date filters on period reports; CSV export routes under `/api/reports/*/export`. Permission `report:read`; read-only (no mutations / no GST recalculation).
  * Tests: `tests/reporting/business-reports.test.ts` (sales totals, profit math, AR/AP outstanding, tenant isolation).

* Supervisor-led dashboard Generative UI (UX overhaul on top of `23-dashboard.md`):
  * `modules/ai/` Supervisor orchestrates Data Fetcher → Analyst → Anomaly Scout → Generative UI Mapper. KPIs cite fact ids only (Zod `DashboardViewSchema` + quality gate).
  * `DashboardCanvas` renders MetricCard / AreaChart / ActivityList / InsightBanner from validated JSON; AI-down uses `source: "fallback"`.
  * Layout: left column = empty/KPI/charts; right column = Alerts (insights) stacked above Recent activity.
  * App top bar: Clerk `OrganizationSwitcher` + ⌘K route command palette (constrained to avoid horizontal overflow). Chart header period filters (7d / 30d / 3m); KPI card gradients; no Overview/Reports/Accounting tabs on `/app`.
  * Tests: `tests/ai/dashboard-supervisor.test.ts`.

* Dashboard canvas height balance:
  * KPI cards share `min-h-28` / `h-full`; lg grid pairs KPI↔Alerts and Chart↔Activity so row heights match.

* Dashboard Phase B (surface unused overview data):
  * Second KPI row: Payables, Overdue, Cash in, Cash out (cited money facts + report/payment hrefs).
  * Recent activity merges invoices + expenses; data fetcher emits `fact.expense.*`.
  * Welcome empty state also requires `recentExpenses` empty (aligned with merged activity; avoids “no expenses yet” with an expense list).
  * Low stock remains Alerts-only via anomaly scout (not a money KPI).

* Dashboard canvas visual polish (UI-only):
  * Shared right-rail `size="sm"` chrome for Alerts + Activity (scroll bodies, empty typography).
  * Compact insights as severity accent list rows with `StatusBadge` (Fact / Recommendation); quieter icon dismiss.
  * Activity `divide-y` rows + empty hint; chart card matches KPI `size="sm"`; empty chart `min-h` + `text-sm`.
  * Period/timezone meta strip under `PageHeader` (fallback notice in same strip).

* Dashboard chart / KPI polish:
  * Monochrome gradient area chart (`--chart-1` / `--chart-3`); URL `?range=` presets `last_7_days` | `last_30_days` | `last_3_months` (default last 7 days).
  * `DashboardMetricCard` vertical gradient only; `SidebarInset` / `AppTopBar` `min-w-0` overflow fixes.

* Dashboard (`23-dashboard.md`):
  * `modules/reporting/` `getDashboardOverview` — sales, expenses, profit, receivables/payables, receipts/payments-out, overdue, low-stock, recent lists, daily series. Date range: this month (tenant timezone) or custom.
  * `/app` dashboard UI with metric cards, Chart primitive (sales vs expenses via `--chart-*`), attention alerts, empty state. AI insights slot deferred (not rendered until `28`). Permission `report:read`.
  * Tests: `tests/reporting/dashboard.test.ts` (empty business, KPI match, tenant isolation, this-month range).

* GST reporting (`22-gst-reporting.md`):
  * `modules/reporting/` GST period summary + CSV export from stored sales/purchase/expense tax fields. `modules/tax` `sumStoredGst` / header↔line integrity check (no tax recalculation).
  * Reports hub + GST summary UI (`/app/reports`, `/app/reports/gst`); export via `/api/reports/gst/export`. Permission `report:read`. Nested Reports → GST in sidebar.
  * Tests: `tests/reporting/gst-reporting.test.ts` (period totals match stored breakdowns, tenant-scoped export, draft/untaxed excluded).

* Accounting workspace (`21-accounting-workspace.md`):
  * Ledger query (account + date/period), trial balance for a period, period status + close (`Business.closedThroughPeriodKey`), reversal and manual adjustment journals via posting service (never UPDATE posted lines).
  * Accounting UI: Overview, Chart of accounts, Journals (list/detail/new), Ledger, Trial balance, Periods. Nested sidebar under Accounting.
  * Permissions: `report:read` for views; `accounting:post` for reverse/adjust/close. Posting actions pass tenant `closedThroughPeriodKey`.
  * Tests: `tests/accounting/workspace.test.ts` (TB balance, reversal, closed-period reject, cross-tenant ledger, adjustment).

* Supplier payments (`20-supplier-payments.md`):
  * `modules/payments/` supplier payments + allocation lines (same module/allocation rules as customer receipts). Record against unpaid/partial purchase bills. Partial and full payment. Over-allocation rejected.
  * Purchase payment status and supplier outstanding derived from allocations. Atomic payment + allocations + balanced journal (Dr Payable, Cr Cash/Bank) + audit + outbox (`PaymentMade`). Number series `PAY/{FY}/{seq}`.
  * Methods: Cash, UPI, Bank Transfer, Card, Cheque (labels only; no gateway). Permissions `payment:*`. Purchases → Payments UI plus bill detail “Record payment”.
  * Tests: `tests/payments/supplier-payments.test.ts` (partial/full, over-allocation, journal balance, outstanding, cross-tenant rejection).

* Purchases (`19-purchases.md`):
  * `modules/purchases/` purchase bills + lines. Create/edit (draft only)/view/list/search. Supplier + catalog lines, quantity, purchase price, line discount, GST via `modules/tax` only (`transactionType: PURCHASE`).
  * Per-tenant number series `BILL/{FY}/{seq}`. Status: draft / posted / unpaid / partially paid / paid / cancelled. Draft-only edits; posted amounts immutable (cancel draft only).
  * `postPurchase` in one transaction: validate lines, inventory stock-in (`PURCHASE`/`IN` via `recordInventoryMovement` for tracked items), balanced journal (Dr Inventory / Operating expense, Dr Input GST, Cr Payable), audit + outbox (`PurchaseCreated` / `PurchasePosted`).
  * Supplier outstanding from unpaid posted bills (reduced by allocations from spec `20`). Permissions `purchase:*`. Purchases → Bills UI.
  * Tests: `tests/purchases/purchases.test.ts` (posting, journal balance, inventory IN, outstanding, double-post, cross-tenant rejection, posted immutability).

* Expenses (`18-expenses.md`):
  * `modules/expenses/` record/list/detail. Category, business date, money amount, optional GST via tax engine, payment methods matching spec 17 (Cash, UPI, Bank Transfer, Card, Cheque), notes.
  * Attachments through `modules/documents/` (`ownerRecordType: EXPENSE`); document upload/read/delete permissions are still required.
  * Atomic record: balanced journal (Dr Operating expense, Dr Input GST when taxed, Cr Cash/Bank) + audit + outbox (`ExpenseRecorded`). Number series `EXP/{FY}/{seq}`.
  * Permissions `expense:create` / `expense:read`. Expenses UI with category and date filters.
  * Tests: `tests/expenses/expenses.test.ts` (untaxed/taxed journals, filters, attachments, cross-tenant rejection).

* Customer payments (`17-customer-payments.md`):
  * `modules/payments/` customer receipts + allocation lines. Record against one or more unpaid/partial invoices in-tenant. Partial and full payment. Over-allocation rejected.
  * Invoice payment status and customer outstanding derived from allocations (not a stored balance). Atomic payment + allocations + balanced journal (Dr Cash/Bank, Cr Receivable) + audit + outbox (`PaymentReceived`).
  * Methods: Cash, UPI, Bank Transfer, Card, Cheque (labels only; no gateway). Permissions `payment:*`. Sales → Payments UI plus invoice detail “Record payment”.
  * Tests: `tests/payments/payments.test.ts` (partial/full, over-allocation unit + workflow, journal balance, outstanding, cross-tenant rejection).

* Unified status badges (UI):
  * Single `StatusBadge` in `components/business/status-badge.tsx` with semantic tones (`success` / `warning` / `danger` / `info` / `neutral`) mapped to `--state-*` CSS tokens (not Tailwind hue palettes). Sizes: `sm` (previous default), `md` (new default), `lg`.
  * Domain maps in `components/business/status-tone.ts` for quotations, invoices, stock, parties, and catalog kind/tracking.
  * Replaced per-domain badge components and raw status `Badge` usages across sales, purchases, and inventory list/detail pages. shadcn `components/ui/badge.tsx` unchanged.

* Sales invoices (`16-sales-invoices.md`):
  * `modules/sales/` sales invoices + lines. Create/edit (draft only)/view/list/search. Customer + catalog lines, quantity, line discount, GST via `modules/tax` only.
  * Per-tenant number series `INV/{FY}/{seq}`. Status: draft / posted / unpaid / partially paid / paid / cancelled. Draft-only edits; posted amounts are immutable (cancel draft only).
  * `postInvoice` in one transaction: validate lines, persist posted status + journal link, inventory stock-out (`SALE`/`OUT` via `recordInventoryMovement`), balanced journal (Dr Receivable, Cr Sales, Cr Output GST; Dr COGS / Cr Inventory for tracked goods), audit + outbox (`SalesInvoicePosted`).
  * Quotation conversion: accepted quotation → draft invoice (copy lines), quotation marked `CONVERTED`; cannot convert twice.
  * Server-side GST Tax Invoice PDF (pdfkit) stored via documents adapter (`ownerRecordType: INVOICE`). Create/edit live preview shares `InvoiceDocumentView`. Optional business logo on Settings.
  * Permissions `invoice:*`. Sales → Invoices UI with GST breakdown and payment status display (allocations in spec `17`).
  * Tests: `tests/sales/invoices.test.ts` (posting, journal balance, inventory movement, conversion, cross-tenant rejection).

* Quotations (`15-quotations.md`):
  * `modules/sales/` quotations and lines. Create/edit (draft only)/view/list/search. Customer + catalog product/service lines, quantity, line discount, GST via `modules/tax` only (stored per line and header).
  * Money primitives for amounts; quantity primitives for line qty. Per-tenant number series `QT/{FY}/{seq}`.
  * Status: draft / sent / accepted / cancelled / converted. Accepted quotations convert to draft invoices (spec `16`). No inventory or accounting on quotation alone.
  * Permissions `quotation:*` (staff can create/read/update; cancel is owner/admin; accountant read-only). Audit + outbox on create/update/status changes.
  * Sales → Quotations UI with GST preview on the detail page. Cross-tenant get-by-id rejected.

* Inventory (`14-inventory.md`):
  * `modules/inventory/` movement-based stock. Current quantity is the signed sum of movements (no public balance UPDATE).
  * Opening stock (once per product), manual adjustments (`inventory:adjust`), and `recordInventoryMovement` for later sale stock-out / purchase stock-in.
  * Low-stock detection from tenant `Business.lowStockThreshold` (default 5; editable in business settings). Only inventory-tracked products participate.
  * Inventory → Stock list, low-stock alert, product stock detail with movement history. Product detail shows derived quantity.
  * Audit + outbox (`InventoryOpened` / `InventoryAdjusted` / `InventoryMoved`). Cross-tenant stock access rejected.
  * Opening-stock accounting journals deferred to specs `16`/`19` (no silent skip of the debit=credit invariant).

* Design system — shadcn blocks + dark mode:
  * Neutral zinc tokens (black primary in light, white primary in dark). First-class dark mode via `next-themes` (`.dark` on `html`, persisted).
  * Theme toggle (Light / Dark / System) uses dropdown items + `setTheme`; top-right of the workspace bar, public header, auth, and setup chrome.
  * Comfortable control density (`h-10` buttons/inputs/selects, `h-10` sidebar rows, `text-base` body, `rounded-md` surfaces, `18rem` sidebar). Workspace screens restyled to blocks chrome; no fake dashboard KPIs.

* Products catalog (`13-products-catalog.md`):
  * `modules/catalog/` create/edit/view/list/search for products and services. Prices as `DECIMAL(18,2)` / money primitives (not float). SKU unique per tenant.
  * Fields: name, SKU, unit, selling/purchase price, HSN/SAC, GST rate reference (bps), simple category, inventory-tracking flag. Services never track stock.
  * Tenant + `product:*` permissions. Audit + outbox (`ProductCreated` / `ProductUpdated`).
  * Inventory → Products UI with “New product”. Stock shows `0` / “No stock movements yet” when tracking is on; no fake quantity when tracking is off. Cross-tenant ID access rejected.

* Suppliers (`12-suppliers.md`):
  * Same `modules/party/` as customers (no second party module). Supplier create/update/get/list/search/deactivate with GSTIN validation reused from customers.
  * Queries always include `tenantId` and `kind: SUPPLIER`. No stored payable field.
  * Tenant + `supplier:*` permissions. Audit + outbox (`SupplierCreated` / `SupplierUpdated` / `SupplierDeactivated`).
  * Purchases → Suppliers list (primary action “New supplier”), create/edit forms, detail page with outstanding payable placeholder (`₹0` / “No bills yet”). Cross-tenant ID access rejected.

* Customers (`11-customers.md`):
  * `modules/party/` customer vertical slice (shared party module; suppliers not shipped in this spec).
  * Prisma `Party` (`CUSTOMER` | `SUPPLIER`) with contacts, billing address, GSTIN, GST registration status, and `ACTIVE` | `INACTIVE`. No stored outstanding field.
  * Use cases: create, update, get, list/search/filter, deactivate. Tenant + `customer:*` permissions. Audit + outbox (`CustomerCreated` / `CustomerUpdated` / `CustomerDeactivated`).
  * Sales → Customers list (primary action “New customer”), create/edit forms, detail page with outstanding placeholder (`₹0` / “No invoices yet”). Cross-tenant ID access rejected.

* Documents and object storage (`10-documents-storage.md`):
  * `lib/storage/` adapter interface (`upload` / `download` / `delete`) with size limits and safe keys. Local/filesystem adapter for development/test; Cloudflare R2 (S3-compatible) adapter for production.
  * Adapter selection fails closed: production defaults to R2; missing R2 config rejects initialization; `STORAGE_DRIVER=local` is rejected in production (no silent filesystem fallback).
  * `modules/documents/` tenant-scoped metadata (owner record type/id, filename, sniffed content type, size, storage key, uploaded by, timestamps). Binaries stay in object storage, not PostgreSQL.
  * Upload validation sniffs magic bytes (PDF/JPEG/PNG/WebP), ignores client content-type/path, rejects oversized and disallowed types. Downloads use `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
  * Permissions `document:upload` / `document:read` / `document:delete`. Queries always include `tenantId`. Uploads are audited.
  * Settings documents page uses the existing Attachment primitive; `components/ui/*` unchanged. Prisma `Document` + migration `20260819170000_add_documents`.

* Accounting foundation (`09-accounting-foundation.md`):
  * `modules/accounting/domain/` — balanced-journal invariant, period keys (`YYYY-MM` + `FY2026-27`), small Indian SMB chart template. No Prisma/Next/Clerk.
  * Posting service `postJournal` / `reverseJournal` — other modules must call these; journal tables are not written directly. Unbalanced journals rejected. Closed periods rejected via `Business.closedThroughPeriodKey`.
  * Posted journals are insert-only (no update/delete on `JournalRepository`). Corrections are reversal journals that swap debit/credit.
  * Prisma `Account`, `Journal`, `JournalLine` (money as `DECIMAL(18,2)`); per-tenant unique account codes. Migration `20260819163000_add_accounting_foundation`.
  * Chart of accounts seeded per business on create (11 accounts: cash/bank, AR/AP, inventory, input/output GST, capital, sales, COGS, operating expenses).
  * No ledger UI in this spec.

* Tax engine (`08-tax-engine.md`):
  * `modules/tax/domain/` — pure GST calculation (`calculateGst`), GSTIN/state-code helpers, and documented debit-style rounding (half away from zero in integer paisa; odd paisa on intra-state split goes to SGST). No Next.js, Clerk, or Prisma imports.
  * Intra-state → CGST+SGST; inter-state → IGST. Explicit zero-tax treatments for `NOT_REGISTERED`, composition outward supplies, unregistered purchase counterparties, and 0% exempt rates.
  * `modules/tax/application/calculate-tax.ts` — resolves rate from explicit bps, effective-dated HSN/SAC, tenant tax-rate catalog, then business `defaultGstRateBps`.
  * Prisma `TaxRate` + `HsnSacCode` (effectiveFrom/effectiveTo); `Business.defaultGstRateBps` (default 1800). Migration `20260819160000_add_tax_engine`.
  * Settings: default GST rate (0/5/12/18/28%) on the existing business profile form.
  * Unit tests cover intra-state, inter-state, non-GST/unregistered/composition, remainder split, HSN effective dates, and bigint tax totals.

* Shared kernel primitives (`07-shared-kernel.md`):
  * `modules/shared-kernel/money.ts` — `Money` type using `bigint` minor units (paisa), arithmetic ops (`addMoney`, `subtractMoney`, `multiplyMoney`), comparison, conversion to/from Prisma `Decimal` strings. No IEEE float for authoritative amounts.
  * `modules/shared-kernel/dates.ts` — `BusinessDate` branded type (YYYY-MM-DD), `todayInTimezone`, `financialYearForDate` helper for configurable FY start month.
  * `modules/shared-kernel/schemas.ts` — Zod schemas `moneyInputSchema`, `positiveMoneyInputSchema`, `businessDateSchema` for API/form boundaries.
  * `modules/shared-kernel/format-money.ts` — `formatINR` using `Intl.NumberFormat("en-IN")` for Indian grouping (₹1,25,000), `formatIndianNumber`.
  * `components/business/money-display.tsx` — `<MoneyDisplay>` component with semantic color for negative amounts.
  * `modules/shared-kernel/audit.ts` — append-only `AuditRepository` (Prisma + memory implementations). No update/delete API.
  * `modules/shared-kernel/outbox.ts` — `OutboxRepository` for transactional event persistence (Prisma + memory implementations).
  * Prisma models `AuditRecord` + `OutboxEvent`; migration `20260819092149_add_audit_and_outbox`.
  * `tsconfig.json` target updated to ES2020 for BigInt support.
  * 24 unit tests: money arithmetic without float errors, Indian grouping formatting, business date validation, FY calculation, audit append-only, outbox persistence.

* Application shell (`06-application-shell.md`):
  * `components/shell/app-sidebar.tsx` — full sidebar nav with Dashboard, Sales (Invoices/Customers/Payments), Purchases (Suppliers/Bills/Payments), Inventory (Products/Stock), Expenses, Accounting, Reports, AI Assistant, Settings. Uses shadcn `Sidebar` primitives with `render` prop pattern. Current section highlighted, collapsible to icon mode.
  * `components/shell/app-top-bar.tsx` — top bar with sidebar trigger, separator, content slot, and `UserButton`.
  * `components/shell/page-header.tsx` — reusable page header with title, description, and actions slot.
  * `components/shell/empty-state.tsx`, `error-state.tsx`, `loading-state.tsx`, `coming-soon.tsx` — reusable page states.
  * `app/app/(workspace)/layout.tsx` — workspace layout with `SidebarProvider`, resolves tenant and redirects to `/app/setup` if missing.
  * `app/app/(workspace)/loading.tsx` + `error.tsx` — workspace-level loading/error boundaries.
  * Placeholder routes for unimplemented module pages (Sales, Purchases, Inventory, Expenses, Accounting, Reports, AI Assistant) render "Coming soon" empty states. Dashboard and Settings are functional.
  * Settings pages moved into `(workspace)` group, use `PageHeader` and `authorize()`.
  * `/app/setup` remains outside workspace layout (no sidebar before business creation).

* Authorization policy layer (`05-authorization.md`):
  * `lib/security/permissions.ts` — 26 capability-based permissions; role→permission map for OWNER, ADMIN, STAFF, ACCOUNTANT.
  * `lib/security/authorize.ts` — `authorize(permission)` resolves tenant + checks role permission, fails closed with `AuthorizationError`. `authorizeSync` variant for pre-resolved tenant contexts.
  * `modules/tenant/application/assign-role.ts` — `assignMemberRole` use case; blocks OWNER reassignment, only allows ADMIN/STAFF/ACCOUNTANT as assignable targets.
  * Existing server actions (`updateBusinessProfileAction`, `inviteMemberAction`) and settings pages migrated from ad-hoc `requireBusinessSettingsAccess` to `authorize("settings:update")`.
  * New `assignMemberRoleAction` gated by `authorize("settings:role:assign")` (OWNER-only).
  * 14 unit tests: permission matrix for all 4 roles, OWNER superset invariant, authorize allow/deny, role assignment happy path + edge cases.

* Business / tenant setup — Clerk Organizations + application Business (`04-tenant-business-setup.md`):
  * Prisma `Business` and `Membership` models with unique `clerkOrganizationId`; migration `20260819072015_add_business_and_membership`.
  * `modules/tenant/` documents Clerk Organization ↔ Business mapping and the `tenantId` scoping pattern for future tables.
  * Idempotent owner flow creates Clerk Organization + application Business + owner membership; compensates by deleting the Clerk Organization when Business persistence fails.
  * `lib/tenant/` resolves tenant context from trusted Clerk session org + application membership, verifies live Clerk organization membership, and fails closed (`requireCurrentTenant`, `requireTenantForTrustedResource`).
  * Verified webhook handlers for `organization.*` and `organizationMembership.*` (duplicate replay, out-of-order events, revocation-before-delivery).
  * `/app/setup` business creation, `/app/settings` profile editor (owner/admin), `/app/settings/members` Clerk Organization invitations.
  * Tenant isolation tests reject cross-tenant ID tampering; GSTIN and financial year persist on Business.
* Authentication — Clerk (`03-authentication-clerk.md`):
  * Installed `@clerk/nextjs` and wrapped the App Router with `ClerkProvider`.
  * Added Next.js 16 `proxy.ts` with `clerkMiddleware()`, protecting application routes and keeping sign-in, sign-up, `/`, and the Clerk webhook public.
  * Sign-up, sign-in, and sign-out use Clerk-provided UI (`SignIn`, `SignUp`, `UserButton`).
  * Server-side current-user resolution lives in `lib/auth/` and maps the trusted Clerk user id to an application `User`.
  * Verified, Zod-validated, idempotent webhook handler for `user.created` / `user.updated` / `user.deleted`.
  * Clerk secrets stay server-only; domain modules cannot import `@clerk/nextjs`.
* Project foundation (`02-project-foundation.md`):
  * Typed env config with Zod (`lib/env.ts`).
  * Architecture folders: `modules/`, `lib/{db,auth,security,observability,storage,queue,ai}/`, `prisma/`, `tests/`, `workers/`, `components/business/`.
  * Prisma 7 + local PostgreSQL (no business models yet).
  * Prisma client helper in `lib/db/`.
  * Scripts: `db:generate`, `db:migrate`, `lint`, `lint:fix`, `typecheck`.
  * GitHub Actions CI: lint, typecheck, production build.
  * Production Postgres host is **Neon** (wired in spec `30`; this spec used local Postgres).
* Feature spec catalog created (`context/feature-specs-mvp/`):
  * `README.md` defines execution order and the spec template.
  * Specs `02`–`30` written for remaining MVP units.
  * `01-design-system.md` remains complete; **next implementable spec is `02-project-foundation.md`**.
  * Product areas are **not** marked Complete merely because specs exist.
* Design system and UI primitives (`01-design-system.md`):
  * Installed and configured shadcn/ui (Base UI, `base-nova` style).
  * Installed `lucide-react`.
  * Added `lib/utils.ts` with reusable `cn()` helper.
  * Added shadcn primitives: Button, Card, Dialog, Input, Tabs, Textarea, Scroll Area, Tooltip, Toast, Skeleton, Spinner, Table, Select, Dropdown Menu, Sidebar, Progress, Attachment, Avatar, Badge, Breadcrumb, Calendar, Checkbox, Chart, Context Menu, Navigation Menu, Resizable, Separator.
  * Added composed patterns: Data Table (`components/data-table/`), Date Picker (`components/date-picker.tsx`).
  * Canonical tokens are shadcn nova-neutral CSS variables in `app/globals.css`; AI Business OS `--bg-*` / `--text-*` / `--accent-primary` aliases map onto them. Primary is high-contrast black/white, not blue.
  * Dark mode is first-class (`next-themes`, theme toggle). See `context/ui-context.md`.
  * Added `components/design-system-verify.tsx` for import and `cn()` verification.
* Project specification created.
* `Project overview.md` defined.
* `Architecture.md` defined.
* `UI-Context.md` defined.
* `Coding standards.md` defined.
* `AI-workflow rules.md` defined.
* `Progress tracker.md` defined.
* MVP scope established.
* Core architectural direction established.
* Clerk selected as the authentication provider.
* Clerk Skills selected as the required AI-agent workflow for Clerk-related implementation.

---

# In Progress

*None — ready for `15-share-delivery.md`.*

---

# Next Up

**Active product work** follows [`context/feature-specs-post-mvp/`](feature-specs-post-mvp/) one numbered file at a time.

1. **Current spec:** [`15-share-delivery.md`](feature-specs-post-mvp/15-share-delivery.md)
2. Then `16` Business Guardian
3. **Not now:** [`future-scope.md`](future-scope.md); MVP `29`/`30` until launch after Post-MVP + future-scope

Product sequencing: [`product-roadmap.md`](product-roadmap.md). MVP archive: [`feature-specs-mvp/`](feature-specs-mvp/).

---

## Legacy: Project Foundation (`02-project-foundation.md`) *(complete)*

Build the remaining application foundation (see the spec for exact scope):

* Initialize Next.js + TypeScript. *(app scaffold exists)*
* Configure Tailwind CSS. *(Tailwind v4 is present)*
* Configure shadcn/ui. *(complete — see Completed)*
* Configure ESLint/formatting.
* Configure environment variables.
* Establish project folder structure.
* Establish design tokens. *(complete — see Completed)*
* Establish database connection.
* Establish development scripts.
* Establish initial CI checks.

### Completion Criteria

* Application runs locally.
* Production build succeeds.
* Type checking succeeds.
* Linting succeeds.
* Database connection works.
* Base UI shell renders successfully.

---

## 2. Authentication — Clerk (`03-authentication-clerk.md`) *(complete)*

Implement authentication using **Clerk**.

Clerk is the authoritative authentication provider for the MVP.

### Clerk Implementation Rules

* Use the official Clerk Next.js SDK.
* Use Clerk Skills when implementing or modifying Clerk functionality.
* Do not invent custom authentication infrastructure when Clerk provides the required capability.
* Follow the current Clerk documentation and the installed Clerk Skills.
* Inspect the existing Clerk setup before modifying authentication code.
* Use Clerk's server-side authentication primitives for protected server resources.
* Authentication must be enforced server-side.
* Frontend authentication state must never be treated as sufficient authorization.
* Do not expose Clerk secret keys or other credentials to the client.
* Never hard-code authentication secrets.
* Keep Clerk integration isolated from business-domain logic.
* Resolve the authenticated Clerk user from trusted server-side authentication context.
* Do not accept an arbitrary `userId` from the client when the authenticated Clerk identity is already available server-side.
* Do not use Clerk Organization/Workspace functionality as a substitute for the application's business ownership model. Clerk Organizations are the **workspace identity** boundary; each application Business maps 1:1 via `clerkOrganizationId`.
* The mapping between Clerk Organizations and application Businesses must stay explicit and documented.

### Required Authentication Capabilities

Implement:

* User registration/sign-up.
* User login/sign-in.
* Session management.
* Protected application routes/resources.
* Logout.
* Current authenticated-user resolution.
* Authentication state handling.
* Unauthorized/unauthenticated behavior.
* Server-side authentication checks.
* Authentication-aware API/application boundaries.

### Clerk Agent Workflow

When implementing Clerk:

```text
Read Context
      ↓
Read Progress Tracker
      ↓
Inspect Existing Clerk Setup
      ↓
Load/Use Relevant Clerk Skill
      ↓
Read Relevant Clerk Documentation
      ↓
Plan Small Authentication Unit
      ↓
Implement
      ↓
Test
      ↓
Verify Server-Side Protection
      ↓
Verify Client Behavior
      ↓
Update Progress Tracker
```

The AI developer must not bypass the Clerk Skill workflow by inventing an alternative authentication implementation.

### Completion Criteria

A user can:

```text
Sign Up
 ↓
Sign In
 ↓
Receive Authenticated Session
 ↓
Access Protected Pages/Resources
 ↓
Resolve Current User Server-Side
 ↓
Sign Out
```

The following must also be verified:

* Unauthenticated users cannot access protected resources.
* Authenticated users can access authorized resources.
* Authentication state is available where required.
* Server-side authorization boundaries are enforced.
* No Clerk secret is exposed to the client.
* Authentication failures are handled safely.
* Relevant authentication tests pass.

---

## 3. Business / Workspace Setup

Implement the business entity that owns all business data.

Minimum information:

* Business name.
* Business type.
* Owner.
* Address.
* Phone.
* Email.
* GST registration status.
* GSTIN where applicable.
* Financial year configuration.

### Completion Criteria

A new user can create or configure their business (Clerk Organization + application Business) and access its dashboard. Additional members can be invited to the same business.

---

## 4. Tenant Isolation

Implement the foundational ownership model.

Every business record must belong to a business/workspace.

Example:

```text
Clerk User
 ↓
Clerk Organization
 ↓
Application Business
 ↓
Customers
Products
Invoices
Payments
Expenses
Suppliers
Purchases
Accounting
```

The Clerk identity is the authenticated identity source. Clerk Organizations are the workspace/tenant identity boundary.

The application's Business entity remains the authoritative owner of business data.

### Completion Criteria

A user cannot access another business's records even by manually modifying IDs in requests.

Tenant resolution must happen from trusted authenticated context and application ownership relationships.

---

# Feature Progress

## Customers

* Customer database model — Complete (`Party` kind `CUSTOMER`)
* Create customer — Complete
* Edit customer — Complete
* View customer — Complete
* Customer list — Complete
* Search customers — Complete
* Customer detail — Complete
* Customer transaction history — Not started (after invoices)
* Outstanding balance — Complete (derived from posted invoice remainders minus allocations)

---

## Products

* Product database model — Complete
* Create product — Complete
* Edit product — Complete
* Product list — Complete
* Product details — Complete
* SKU — Complete (unique per tenant)
* HSN/SAC — Complete (stored reference)
* Selling price — Complete (`DECIMAL(18,2)` / money)
* Purchase price — Complete (`DECIMAL(18,2)` / money)
* Tax configuration — Complete (GST rate bps reference; no GST calc in catalog UI)
* Unit of measurement — Complete

---

## Inventory

* Opening stock — Complete (one opening movement per product)
* Stock-in — Interface ready (`recordInventoryMovement` cause `PURCHASE`; wired in spec `19`)
* Stock-out — Interface ready (`recordInventoryMovement` cause `SALE`; wired in spec `16`)
* Inventory adjustment — Complete (`inventory:adjust`)
* Current stock — Complete (derived from movements)
* Low-stock detection — Complete (tenant `lowStockThreshold`, default 5)
* Inventory movement history — Complete

---

## Sales

* Sales workflow — Quotations complete; invoices start in spec `16`
* Quotation create/edit/view/list — Complete
* Quotation numbering — Complete (per tenant, FY series)
* Customer selection — Complete
* Product selection — Complete
* Quantity — Complete
* Discount — Complete (line discount)
* Tax calculation — Complete (tax engine preview/stored breakdown)
* Invoice creation — Complete (`16-sales-invoices.md`)
* Invoice numbering — Complete
* Invoice total — Complete
* Invoice payment status — Complete
* Convert quotation → invoice — Stubbed until spec `16`

---

## Payments

* Record payment — Complete (customer receipts)
* Payment against invoice — Complete (one or more invoices)
* Partial payment — Complete
* Full payment — Complete
* Outstanding balance — Complete (from allocations)
* Payment history — Complete
* Payment status — Complete (invoice unpaid / partial / paid)

---

## Expenses

* Expense model
* Record expense
* Expense categories
* Expense date
* Amount
* Payment method
* Expense list
* Expense summary

---

## Suppliers

* Supplier model — Complete (`Party` kind `SUPPLIER`)
* Create supplier — Complete
* Edit supplier — Complete
* Supplier list — Complete
* Supplier detail — Complete
* Outstanding payable — Complete for unpaid posted bills (derived; full unpaid until spec `20` payments)

---

## Purchases

* Purchase record — Complete (`modules/purchases/`)
* Supplier selection — Complete
* Product selection — Complete
* Quantity — Complete
* Purchase price — Complete
* Tax — Complete (tax engine, `PURCHASE`)
* Purchase total — Complete (money primitives)
* Inventory update — Complete (stock-in on post for tracked items)
* Supplier payable — Complete (Cr Payable on post; outstanding derived until payments in `20`)

---

# Accounting

The MVP accounting system should remain intentionally simple while maintaining financial correctness.

* Chart of Accounts foundation
* Journal entry model
* Debit/credit representation
* Automatic posting from invoices
* Automatic posting from payments — Complete (customer receipts; Dr Cash/Bank, Cr Receivable)
* Automatic posting from expenses
* Automatic posting from purchases
* Ledger queries
* Basic trial balance
* Financial period handling

### Accounting Invariant

Every posted journal must satisfy:

```text
Total Debits = Total Credits
```

Posted accounting records must not be silently mutated.

Corrections should use reversal/adjustment mechanisms.

---

# GST

The MVP should be **GST-ready**, without attempting to build a complete government filing platform.

* GST registration configuration
* GSTIN
* HSN/SAC
* Tax rates
* CGST
* SGST
* IGST
* Taxable amount
* Invoice tax breakdown
* Purchase tax data
* GST reporting data
* GST-oriented reports/export

### Important

GST calculations must be performed by deterministic application logic.

The AI must never be the authoritative tax calculator.

---

# Dashboard

* Revenue summary
* Expense summary
* Profit summary
* Receivables
* Payables
* Cash/payment summary
* Recent invoices
* Recent expenses
* Low-stock alerts
* Overdue invoices
* Important business alerts
* AI insights

---

# Reports

MVP reports:

* Sales report
* Expense report
* Profit summary
* Receivables report
* Payables report
* Inventory report
* GST-oriented summary
* Basic ledger
* Basic trial balance

Reports must consume authoritative business/accounting data.

---

# AI Business Assistant

The AI layer should be implemented **after the underlying business workflows are reliable**.

Initial capabilities:

* Answer business questions
* Search business records
* Summarize sales
* Summarize expenses
* Explain outstanding receivables
* Identify overdue invoices
* Identify low-stock products
* Explain business metrics
* Suggest follow-up actions
* Create drafts
* Perform approved low-risk actions
* Ask for confirmation before sensitive mutations

Example:

```text
User:
Who owes me money?

AI:
You have ₹2,45,000 in outstanding receivables
across 14 invoices.

[View Receivables]
[Prepare Payment Reminders]
```

---

# AI Tool Progress

* AI provider abstraction
* AI gateway
* Tool registry
* Authentication-aware tools
* Tenant-aware tools
* Read-only business tools
* Mutation tools
* Tool input validation
* Tool output validation
* Audit logging
* Confirmation workflow
* AI error handling
* AI evaluation tests

### AI Authentication Requirement

All AI tools that access business data must operate in the context of an authenticated user.

The AI must never:

```text
AI
 ↓
Direct Database
```

or:

```text
AI
 ↓
Unrestricted Clerk API
```

Instead:

```text
Authenticated User
       ↓
AI
       ↓
Authorized Tool
       ↓
Application Use Case
       ↓
Tenant / Permission Check
       ↓
Domain Logic
       ↓
Repository
       ↓
Database
```

Clerk authentication establishes identity.

The application authorization layer establishes whether that identity may perform the requested business operation.

---

# Notifications

MVP notifications:

* Invoice created
* Payment received
* Invoice overdue
* Low stock
* Important business alerts

Future:

* Email
* SMS
* WhatsApp

(See also `context/future-scope.md` for post-R7 distribution channels — not current backlog.)

Do not introduce multiple communication providers until the core notification abstraction is stable.

---

# Testing Progress

## Unit Tests

* Clerk-to-application-user mapping (idempotent upsert/delete)
* Authentication fail-closed when Clerk session is missing
* Tax calculations
* GST calculations
* Invoice totals
* Discount calculations — Complete (quotation line discount + GST on taxable amount)
* Payment allocation — Complete (cannot exceed outstanding or payment amount; full amount must be allocated)
* Inventory calculations — Complete (movement-derived quantity, opening, adjustment, low-stock, tenant isolation)
* Accounting posting
* Permission rules

## Integration Tests

* Database repositories
* Transactions
* Invoice workflow
* Payment workflow — Complete (memory-repo workflow + over-allocation + tenant isolation)
* Inventory workflow
* Accounting workflow
* Tenant isolation
* AI tools
* Authentication-aware application services

## E2E Tests

* Sign up → business setup
* Sign in → protected application
* Create customer → invoice → payment
* Create product → sale → inventory update
* Purchase → inventory → payable
* Expense → accounting/report
* AI question → verified business answer
* Sign out → protected resources inaccessible

---

# Security Progress

* Clerk authentication *(spec 03 complete)*
* Authorization
* Tenant isolation
* Input validation
* API protection *(unauthenticated `/api/me` fails closed)*
* Rate limiting where required
* Secure file handling *(spec 10: sniffed types/size limits, tenant-scoped keys, attachment download, R2 fail-closed)*
* Secret management *(Clerk secrets server-only; webhook signing verified)*
* Audit logging
* Dependency security checks
* AI prompt-injection protections
* AI tool authorization
* Clerk configuration security
* Server-side authentication checks *(spec 03 complete)*

---

# Production Readiness

Before MVP release:

* Production database configured *(Neon)*
* Environment variables configured
* Database migrations verified
* Clerk production instance/configuration verified
* Clerk production environment variables configured securely
* Error monitoring
* Structured logging
* Basic metrics
* Backup strategy
* CI/CD
* Production deployment
* Domain configured
* HTTPS
* Security review
* Performance review
* E2E smoke tests
* MVP release checklist

---

# Open Questions

Record unresolved decisions here.

Format:

```text
### [Question]

Status: Open

Question:
[What needs to be decided?]

Options:
- Option A
- Option B
- Option C

Decision required before:
[Feature / implementation unit]

Impact:
[What parts of the system are affected?]
```

Current questions:

* None. The previous vendor, multi-user, payment-method, GST-depth, accounting, and Clerk Organizations questions are **Accepted** — see Architecture Decisions below.

Do not silently reverse Accepted decisions if they materially affect architecture.

Authentication provider selection is already resolved: **Clerk**.

---

# Architecture Decisions

Record important decisions here.

### Decision: Clerk as Authentication Provider

**Status:** Accepted

Clerk is the authentication provider for the MVP.

**Reason:**

The MVP should use a mature authentication provider rather than implementing authentication, session management, sign-in/sign-up flows, and related security-sensitive infrastructure from scratch.

Clerk provides the authentication primitives required by the Next.js application, including authentication state, sessions, sign-in/sign-up UI, server-side authentication helpers, and route/resource protection. The current Clerk Next.js integration uses `@clerk/nextjs`, `clerkMiddleware()`, `<ClerkProvider>`, and server-side authentication helpers.

**Implementation Rule:**

Clerk is responsible for:

```text
Identity
Authentication
Sessions
Sign In
Sign Up
Sign Out
Authentication State
```

The application is responsible for:

```text
Business Ownership
Tenant Resolution
Business Permissions
Domain Authorization
Business Rules
Financial Authorization
```

Clerk authentication must not replace application-level authorization.

---

### Decision: Neon PostgreSQL

**Status:** Accepted

Production PostgreSQL hosting is **Neon**. Development may continue to use local PostgreSQL. Neon is chosen for serverless Postgres, autoscaling, connection pooling, and usage-based pricing.

---

### Decision: Cloudflare R2 for Object Storage

**Status:** Accepted

Production object storage is **Cloudflare R2** (S3-compatible). Chosen for no egress fees and inexpensive storage. Access stays behind `lib/storage/`; binaries are never stored in PostgreSQL.

---

### Decision: OpenAI Initially, Behind a Provider Abstraction

**Status:** Accepted (superseded for active local/prod selection by Gemini adapter)

The initial AI provider was **OpenAI**. All model calls go through `lib/ai/` so the provider can be replaced later. Tools must not import provider SDKs.

**Update:** A **Gemini** adapter (`lib/ai/gemini-adapter.ts`) is a first-class provider behind the same `AiAdapter` contract. Prefer `AI_PROVIDER=gemini` with `GEMINI_API_KEY` for local/prod. The OpenAI adapter is retained for swap.

---

### Decision: Multi-User From Foundation

**Status:** Accepted

The MVP supports multiple users per business from tenant setup onward. Do not ship an owner-only tenancy model. Roles (`OWNER`, `ADMIN`, `STAFF`, `ACCOUNTANT`) are productized in authorization (spec `05`).

---

### Decision: MVP Payment Methods

**Status:** Accepted

Recordable payment methods: **Cash, UPI, Bank Transfer, Card, Cheque**. No payment gateway in the MVP.

---

### Decision: GST-Ready, Not a Filing Platform

**Status:** Accepted

MVP GST is CGST/SGST/IGST, HSN/SAC, rates, stored breakdowns, and summaries/export. Out of scope: GSTR filing, e-invoicing, e-way-bill.

---

### Decision: Simple Indian Double-Entry Accounting

**Status:** Accepted

MVP accounting is a small per-tenant chart of accounts, balanced immutable journals, ledger, and trial balance. Not Tally/ERP-level statutory packing.

---

### Decision: Clerk Organizations as Workspace Boundary

**Status:** Accepted

Clerk Organizations are the tenant/workspace identity boundary. Each application Business maps 1:1 via unique `clerkOrganizationId`. Clerk owns organization membership at the identity layer; the application Business owns GSTIN, financial year, and all business data. Application authorization remains in the policy layer.

---

### Decision: Clerk Skills for Clerk Development

**Status:** Accepted

Clerk Skills are the required AI-agent workflow for implementing Clerk functionality.

**Reason:**

Clerk provides installable Skills specifically for AI coding agents, including Cursor. These Skills provide specialized knowledge for Clerk authentication, Organizations, user synchronization, and other Clerk capabilities.

When modifying Clerk-related functionality, the AI developer should use the relevant installed Clerk Skill instead of relying solely on generic framework knowledge.

**Implementation Rule:**

For Clerk-related work:

```text
Requirement
    ↓
Inspect Existing Clerk Implementation
    ↓
Use Relevant Clerk Skill
    ↓
Check Current Clerk Documentation
    ↓
Implement Small Unit
    ↓
Test
    ↓
Verify Authentication Boundary
    ↓
Update Progress
```

Do not invent a parallel authentication abstraction when Clerk already provides the required functionality.

---

### Decision: PostgreSQL as Transactional Source of Truth

**Status:** Accepted

All authoritative business and financial records should live in PostgreSQL.

**Reason:**

The MVP requires strong relational integrity, transactions, constraints, reporting queries, and financial consistency.

---

### Decision: Modular Monolith

**Status:** Accepted

The MVP should use a modular monolith rather than microservices.

**Reason:**

The product is still being validated. A modular monolith provides:

* Faster development.
* Simpler deployment.
* Easier transactions.
* Lower infrastructure complexity.
* Clear future extraction boundaries.

---

### Decision: AI Behind Application Tools

**Status:** Accepted

The AI must interact with business functionality through explicit tools/use cases rather than direct database access.

**Reason:**

This provides:

* Authorization.
* Validation.
* Auditability.
* Tenant isolation.
* Safer mutations.
* Provider independence.

---

### Decision: Deterministic Financial Logic

**Status:** Accepted

Financial, accounting, inventory, and GST calculations must be performed by deterministic application code.

**Reason:**

LLMs must not become the authoritative source for financial calculations.

---

### Decision: MVP Before Platform Complexity

**Status:** Accepted

Do not introduce infrastructure such as microservices, Kafka, Elasticsearch, complex event buses, or vector databases unless a real MVP requirement justifies it.

**Reason:**

The first objective is to deliver a complete, reliable business workflow for small Indian businesses.

---

# Implementation Unit Log

## 2026-08-26 — Public pages visual polish

Status: Complete

Implemented:
- Landing hero load parallax (staggered copy vs shot) + soft muted ambient behind shot.
- `LandingProductShot` optional `darkSrc`; dashboard light/dark pairs on hero and relevant bands.
- `RevealOnView` scroll reveal for feature bands, features, how-it-works, CTA.
- Sticky translucent `PublicHeader` with mobile hash nav, focus rings, active section.
- Auth: muted page atmosphere, staggered brand panel, dashboard product cue on md+, denser Clerk column.

Files / Areas:
- `app/page.tsx`, `landing-product-shot.tsx`, `reveal-on-view.tsx`, `landing-feature-band.tsx`
- `landing-features.tsx`, `landing-how-it-works.tsx`, `landing-cta-band.tsx`, `public-header.tsx`
- `auth-split-layout.tsx`, `lib/clerk/auth-page-appearance.ts`, `context/ui-context.md`

---

## 2026-08-26 — Ofhikos credit on auth + setup

Status: Complete

Implemented:
- Shared `OfhikosCredit`; used in landing footer, auth split form column, and setup page below the card.
- Not placed in PublicHeader, AuthChrome, or workspace shell.

Files / Areas:
- `components/shell/ofhikos-credit.tsx`, `landing-footer.tsx`, `auth-split-layout.tsx`
- `app/app/setup/page.tsx`, `context/ui-context.md`

---

## 2026-08-26 — Landing footer ofhikos credit + copyright

Status: Complete

Implemented:
- `LandingFooter` with nav, “Made with ♥️ by ofhikos” (theme-aware logos), and `© 2026 AI Business OS`.
- Logos at `public/branding/ofhikos-light.png` and `ofhikos-dark.png`.

Files / Areas:
- `components/shell/landing-footer.tsx`, `app/page.tsx`, `public/branding/`
- `context/ui-context.md`

---

## 2026-08-26 — Smooth scroll for landing anchors

Status: Complete

Implemented:
- `scroll-smooth` on `html` in `app/globals.css`; `prefers-reduced-motion: reduce` sets `scroll-behavior: auto`.

Files / Areas:
- `app/globals.css`, `context/ui-context.md`

---

## 2026-08-26 — Landing real product images (Oculon-style bands)

Status: Complete

Implemented:
- Added `public/landing/` screenshots (dashboard light/dark, invoices list, invoice detail, business settings).
- `LandingProductShot` + `LandingFeatureBand`; stacked hero with dashboard shot; alternating product bands.
- How-it-works uses business-settings shot; removed wireframe workspace/setup mocks.

Files / Areas:
- `public/landing/*.png`
- `app/page.tsx`, `landing-product-shot.tsx`, `landing-feature-band.tsx`, `landing-how-it-works.tsx`
- Removed `landing-workspace-preview.tsx`, `landing-setup-preview.tsx`
- `context/ui-context.md`

---

## 2026-08-26 — Landing page upgrade (structure from SaaS templates)

Status: Complete

Implemented:
- Richer hero workspace chrome preview (sidebar + Daily Brief + activity labels).
- Features bento (4 cards), how-it-works (3 steps + setup mock), closing primary CTA band.
- Header/footer hash links to Features and How it works.
- Token-only palette; no fake social proof or pricing.

Files / Areas:
- `app/page.tsx`, `components/shell/public-header.tsx`
- `landing-workspace-preview.tsx`, `landing-features.tsx`, `landing-how-it-works.tsx`, `landing-setup-preview.tsx`, `landing-cta-band.tsx`
- Removed `landing-brief-preview.tsx`
- `context/ui-context.md`

---

## 2026-08-26 — Public pages polish

Status: Complete

Implemented:
- Landing: benefit H1, primary Create account + ghost Sign in, first-viewport Daily Brief chrome preview (labels only), footer auth links, metadata, motion-safe fade-in.
- Auth split: `min-h-svh`, `max-w-5xl`, Back to home, mobile capability line, differentiated sign-in/sign-up copy + Clerk element density.
- Setup `AuthChrome` aligned with `PublicBrand`.

Files / Areas:
- `app/page.tsx`, `app/sign-in/`, `app/sign-up/`
- `components/shell/landing-brief-preview.tsx`, `auth-split-layout.tsx`, `auth-chrome.tsx`
- `lib/clerk/auth-page-appearance.ts`
- `context/ui-context.md`

---

## 2026-08-26 — Professional public / sign-in / sign-up pages

Status: Complete

Implemented:
- Landing (`/`) hero, three real value-prop cards, footer; header CTAs link to `/sign-in` and `/sign-up`.
- Shared `PublicBrand` and `AuthSplitLayout` (token-based split panel; dark-mode primary panel; mobile stack).
- Sign-in / sign-up wrap Clerk `<SignIn>` / `<SignUp>` with flush elevation and hidden Clerk logo (brand in left panel).
- Documented public/auth page conventions in `ui-context.md`.

Files / Areas:
- `app/page.tsx`, `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`
- `components/shell/public-brand.tsx`, `auth-split-layout.tsx`, `public-header.tsx`
- `lib/clerk/auth-page-appearance.ts`
- `context/ui-context.md`

Notes:
- Setup (`/app/setup`) still uses `AuthChrome`; no custom password stack.

---

## 2026-08-23 — Dashboard chart default Last 7 days

Status: Complete

Implemented:
- Sales vs expenses chart / dashboard range now defaults to `last_7_days` when `?range=` is omitted.
- Invalid range fallback on `/app` shows last 7 days.

Files / Areas:
- `modules/reporting/domain/dashboard-range.ts`, `schemas/dashboard.schema.ts`
- `app/app/(workspace)/page.tsx`
- `tests/reporting/dashboard.test.ts`

Tests:
- `tests/reporting/dashboard.test.ts` — omitted preset resolves to last 7 days.

Verification:
- Default preset and invalid-filter fallback are last 7 days.

Notes:
- `this_month` / `custom` / AI tool period defaults unchanged.

---

## 2026-08-20 — DataTable dnd-kit hydration mismatch

Status: Complete

Implemented:
- Pass a stable `id={`list-dnd-${listKey}`}` to `DndContext` and `SortableContext` so drag-handle `aria-describedby` matches on server and client when changing rows per page.

Files / Areas:
- `components/data-table/data-table.tsx`

---

## 2026-08-20 — Server-driven list filters (From–To dates + payment method)

Status: Complete

Implemented:
- From–To date range filters on invoices (`issuedOn`), quotations (`issuedOn`), payments (`receivedOn`), products (`createdAt`), stock (`createdAt`), and expenses (already had them). Customers and suppliers excluded by design.
- Payment method filter on the payments list page.
- Each filter: search schema (Zod `from`/`to`/`method`), domain filter type, Prisma SQL `WHERE`, memory repo, use case function, and page toolbar with `type="date"` inputs and a method `<Select>`.
- `hasFilters` on each page treats `from`/`to`/`method` as active filters for empty-state messaging.
- Tests for invoice, quotation, payment (date + method), and product date-range filtering.

Files / Areas:
- `modules/sales/schemas/invoice.schema.ts`, `quotation.schema.ts`
- `modules/payments/schemas/payment.schema.ts`
- `modules/catalog/schemas/product.schema.ts`
- `modules/inventory/schemas/inventory.schema.ts`
- `modules/sales/domain/types.ts` (InvoiceListFilter, QuotationListFilter)
- `modules/payments/domain/types.ts` (PaymentListFilter + method)
- `modules/catalog/infrastructure/repositories.ts` (ProductListFilter)
- `modules/sales/infrastructure/prisma-sales-repository.ts`
- `modules/payments/infrastructure/prisma-payments-repository.ts`
- `modules/catalog/infrastructure/prisma-catalog-repository.ts`
- `modules/inventory/infrastructure/prisma-stock-list-repository.ts`
- `modules/sales/infrastructure/repositories.ts` (memory)
- `modules/payments/infrastructure/repositories.ts` (memory)
- `modules/catalog/infrastructure/repositories.ts` (memory)
- `modules/sales/application/invoices.ts`, `quotations.ts`
- `modules/payments/application/queries.ts`
- `modules/catalog/application/products.ts`
- `modules/inventory/application/stock-list-page.ts`
- `app/app/(workspace)/sales/invoices/page.tsx`
- `app/app/(workspace)/sales/quotations/page.tsx`
- `app/app/(workspace)/sales/payments/page.tsx`
- `app/app/(workspace)/inventory/products/page.tsx`
- `app/app/(workspace)/inventory/stock/page.tsx`
- `tests/list-filters/date-range-filters.test.ts`

---

## 2026-08-20 — Shadcn DatePicker on list From–To filters

Status: Complete

Implemented:
- Extended `DatePicker` with `id` / `name` / `defaultValue` and a hidden `YYYY-MM-DD` input so GET list toolbars submit `from`/`to` without native `<input type="date">`.
- Local calendar parse/format (no UTC `toISOString` slice); month/year dropdown caption; trigger sized like `Input`.
- Replaced From/To date inputs on expenses, invoices, quotations, payments, products, and stock list pages. Create/edit forms still use native dates.

Files / Areas:
- `components/date-picker.tsx`
- `app/app/(workspace)/expenses/page.tsx`
- `app/app/(workspace)/sales/invoices/page.tsx`
- `app/app/(workspace)/sales/quotations/page.tsx`
- `app/app/(workspace)/sales/payments/page.tsx`
- `app/app/(workspace)/inventory/products/page.tsx`
- `app/app/(workspace)/inventory/stock/page.tsx`

---

## 2026-08-20 — Calendar month/year shadcn Select dropdowns

Status: Complete

Implemented:
- Replaced DayPicker’s native `<select>` month/year dropdowns with shadcn `Select` via `components.Dropdown` in `Calendar`, so menus use design-system popover tokens instead of OS chrome.
- DatePicker keeps the calendar open when interacting with nested Select (`outside-press` / `focus-out` cancel when the event hits select content).
- Nav overlay no longer steals clicks (`pointer-events-none` on nav, `pointer-events-auto` on prev/next).
- DatePicker controlled `month` stays in sync with the selected value; changing month/year via dropdowns moves the selected day into that month (clamped).

Files / Areas:
- `components/ui/calendar.tsx`
- `components/date-picker.tsx`

---

## 2026-08-20 — Reusable server-paginated DataTable

Status: Complete

Implemented:
- Shared list contract: `ListPageResult`, `listPageParamsSchema`, and `list*Page` on all eight list queries (invoices, quotations, customers, payments, suppliers, products, stock, expenses) with SQL `skip`/`take`/`count`.
- `ListRowOrder` Prisma model + migration; read path joins order in SQL (`NULLS FIRST`); write path uses neighbor-based ranks without loading full lists.
- Extended `components/data-table/` (TanStack v9, `@dnd-kit`) with server pagination footer, drag handle, and `saveListOrder` server action.
- Migrated eight workspace list pages to `*DataTable` wrappers; filters stay GET/server-side; empty state when filtered `total === 0`.
- Stock list: low-stock filter and pagination in SQL via movement aggregates.

Files / Areas:
- `modules/shared-kernel/list-page.ts`, `modules/list-order/`
- `components/data-table/`, `components/business/*-data-table.tsx`
- `lib/list-table-url.ts`
- Eight list pages under `app/app/(workspace)/`
- `prisma/migrations/20260820080000_add_list_row_orders/`

---

## 2026-08-20 — Server-paginated list pages

Status: Complete (superseded by Reusable server-paginated DataTable entry above)

Implemented:
- Wired seven workspace list pages to server pagination (`list*Page`) and shared `*DataTable` wrappers, matching the expenses list pattern.
- Parse `page` / `pageSize` via `parseListTableParams`; empty state uses `result.total === 0`; filter forms preserve `pageSize` when not default and omit `page` (reset to 1).
- Stock list uses `listStockPositionsPage`; low-stock alert count uses a separate count query (`lowStockOnly: true`, `pageSize: 1`) when the stock filter is `ALL`.

Files / Areas:
- `app/app/(workspace)/sales/invoices/page.tsx`
- `app/app/(workspace)/sales/quotations/page.tsx`
- `app/app/(workspace)/sales/customers/page.tsx`
- `app/app/(workspace)/sales/payments/page.tsx`
- `app/app/(workspace)/purchases/suppliers/page.tsx`
- `app/app/(workspace)/inventory/products/page.tsx`
- `app/app/(workspace)/inventory/stock/page.tsx`

---

## 2026-08-20 — Expenses

Status: Complete

Implemented:
- Added `modules/expenses/` to record business spend: category, business date, money amount, optional GST via the tax engine, payment method (same labels as spec 17), and notes.
- Recording is posted immediately in one transaction: numbered expense, balanced journal (Dr Operating expense, Dr Input GST when tax applies, Cr Cash or Bank), audit, and outbox (`ExpenseRecorded`).
- List/filter by category and date. Detail shows GST breakdown and attachments via the documents module (`EXPENSE` owner). Document upload/read/delete permissions are not bypassed.
- Prisma `Expense` + `ExpenseNumberSeries`. Migration `20260820070000_add_expenses`. Number series `EXP/{FY}/{seq}`. Permissions `expense:create` / `expense:read`.
- Expenses UI under `/app/expenses`. No payroll, reimbursements, corporate cards, or payment gateway.

Files / Areas:
- `modules/expenses/`
- `prisma/schema.prisma`
- `prisma/migrations/20260820070000_add_expenses/`
- `app/app/(workspace)/expenses/`
- `components/business/record-expense-form.tsx`
- `components/business/document-attachment-list.tsx`
- `components/business/upload-document-form.tsx`
- `tests/expenses/expenses.test.ts`

Tests:
- `npm test` (182 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Owner can record, list, filter, and attach evidence in-tenant.
- Posted expense creates a balanced journal.
- Cross-tenant get-by-id and attachment are rejected.
- Production build succeeds.

Notes:
- Next implementation unit is `19-purchases.md`.

---

## 2026-08-20 — Purchases

Status: Complete

Implemented:
- Added `modules/purchases/` purchase/supplier bills with lines: supplier selection, catalog products/services, quantity, purchase price, line discount, GST via the tax engine only (`PURCHASE`), and tenant numbering `BILL/{FY}/{seq}`.
- Draft create/update; post is atomic: purchase rows, inventory stock-in for tracked items (`PURCHASE`/`IN` via inventory module), balanced journal (Dr Inventory and/or Operating expense, Dr Input GST, Cr Accounts Payable), audit, and outbox (`PurchaseCreated` / `PurchasePosted` / `PurchaseCancelled`).
- Status set: draft / posted / unpaid / partially paid / paid / cancelled. Posted amounts cannot be silently edited (draft cancel only). Supplier payable outstanding is derived from unpaid posted bills (full unpaid before spec `20` payments).
- Permissions `purchase:create` / `purchase:read` / `purchase:update` / `purchase:cancel`. List key `bills`. Purchases → Bills UI (list/create/detail/edit) plus supplier detail outstanding from bills.
- Prisma `Purchase`, `PurchaseLine`, `PurchaseNumberSeries`. Migration `20260820100000_add_purchases`. No warehouse/MRP; no supplier payment recording (spec `20`).

Files / Areas:
- `modules/purchases/`
- `prisma/schema.prisma`
- `prisma/migrations/20260820100000_add_purchases/`
- `app/app/(workspace)/purchases/bills/`
- `app/app/(workspace)/purchases/suppliers/[id]/page.tsx`
- `components/business/bill-form.tsx`
- `components/business/bill-status-actions.tsx`
- `components/business/bills-data-table.tsx`
- `lib/security/permissions.ts`
- `modules/list-order/`
- `tests/purchases/purchases.test.ts`

Tests:
- `npm test -- tests/purchases/purchases.test.ts tests/security/permissions.test.ts`
- `npm run typecheck`
- `npm run build`

Verification:
- Posted purchase increases inventory via movements and creates a balanced journal.
- Supplier payable outstanding reflects unpaid posted purchases (full unpaid before payments).
- Posted amounts cannot be silently edited.
- Cross-tenant access is rejected.
- Production build succeeds.

Notes:
- Next implementation unit is `20-supplier-payments.md`.

---

## 2026-08-20 — Supplier payments

Status: Complete

Implemented:
- Extended `modules/payments/` with supplier payments and allocation lines (reused shared document-allocation rules; no second money/allocation library). Record a payment against one or more unpaid/partial purchase bills in the same tenant. Partial and full payment. Over-allocation is rejected.
- Purchase payment status and supplier outstanding are derived from allocations, not a stored balance. Posted purchase line amounts are not mutated.
- Atomic transaction: payment + allocations + balanced journal (Dr Accounts Payable, Cr Cash or Bank by method) + audit (`payment.made`) + outbox (`PaymentMade`). Number series `PAY/{FY}/{seq}`.
- Methods: Cash, UPI, Bank Transfer, Card, Cheque (labels only; no gateway). Permissions `payment:create` / `payment:read`. Purchases → Payments list/detail/record UI. Bill detail “Record payment” plus payment history. Supplier outstanding from bill remainders.
- Prisma `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierPaymentNumberSeries`. Migration `20260820110000_add_supplier_payments`. List key `supplier-payments`.

Files / Areas:
- `modules/payments/` (allocation shared core, supplier record/queries/repos/schemas)
- `prisma/schema.prisma`
- `prisma/migrations/20260820110000_add_supplier_payments/`
- `app/app/(workspace)/purchases/payments/`
- `app/app/(workspace)/purchases/bills/[id]/page.tsx`
- `app/app/(workspace)/purchases/suppliers/[id]/page.tsx`
- `components/business/record-supplier-payment-form.tsx`
- `components/business/supplier-payments-data-table.tsx`
- `modules/list-order/`
- `tests/payments/supplier-payments.test.ts`
- `tests/purchases/purchases.test.ts`

Tests:
- `npx vitest run tests/payments/supplier-payments.test.ts tests/payments/payments.test.ts tests/purchases/purchases.test.ts`
- `npm run typecheck`
- `npm run lint`

Verification:
- Partial/full supplier payment updates payable correctly.
- Over-allocation is rejected (unit + workflow tests).
- Journal balances (Dr Payable / Cr Cash or Bank).
- Cross-tenant access is rejected.
- Typecheck succeeds.

Notes:
- Next implementation unit is `21-accounting-workspace.md`.

---

## 2026-08-21 — Gemini AI Provider Adapter

Status: Complete

Implemented:
- Added `lib/ai/gemini-adapter.ts` behind the existing `AiAdapter` contract (`generateContent` + function calling via `fetch`). OpenAI adapter retained for swap.
- Extended `resolveAiConfig` / env for `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_BASE_URL`. When unset, a Gemini key is preferred over an OpenAI key.
- No changes to tools, confirmation, or the assistant chat loop.

Files / Areas:
- `lib/ai/` (`gemini-adapter.ts`, `resolve-config.ts`, `create-adapter.ts`, `types.ts`, `adapter.ts`, `index.ts`)
- `lib/env.ts`, `.env.example`
- `tests/ai/ai-gateway.test.ts`, `tests/ai/ai-safety.test.ts`
- `context/architecture-context.md`, `context/code-standards.md`, `context/feature-specs-mvp/README.md`

Notes:
- Rotate any Gemini key that was pasted into chat; store only in `.env`.

---

## 2026-08-21 — AI Assistant

Status: Complete

Implemented:
- Added the assistant surface: `/app/assistant` page plus a top-bar entry that opens the same conversation in a sheet. Conversation, empty state with starter questions, honest loading text, per-message error state with retry, and contextual navigation chips — no fake progress and no invented affordances.
- Added `runAiAssistant`: the tool-calling loop over `getAiAdapter()`. It advertises only `listAiToolSpecsForRole(role)`, builds messages with `buildAiConversation`, runs tools through `runAiToolCall` with a server-built `AiToolContext`, returns results as fenced untrusted content, and stops after `AI_ASSISTANT_MAX_ITERATIONS` (4) rather than looping.
- Facts are separated from opinion in code, not just visually. `factsFromToolResult` is the only producer of displayed business facts and reads schema-validated tool output, so every figure in the "Verified business data" band cites the tool that produced it. Model prose can only reach the "AI analysis" and "AI recommendation" bands. An answer with no tool behind it that still quotes figures is flagged as unverified.
- Added the confirmation gate end to end. The single action tool `send_payment_reminders` (`invoice:update`, `requiresConfirmation: true`) reuses `getReceivablesReport` and the notifications in-app channel. During a chat turn the loop refuses to execute it and returns a preview instead; execution needs a second request to `/api/assistant/actions/confirm` carrying an HMAC-signed token that binds the confirmation to the previewed tenant, user, tool, and arguments. `runConfirmedAiAction` then re-resolves the tool and hands to `executeAiTool`, which re-runs the identity guard, permission check, and schema validation before running and audits the result as `ai.tool.invoked`.
- The model names invoices; it never authors a reminder. Customer, amount, and overdue age are re-derived server-side, unknown or non-overdue invoices are skipped, and reminders are idempotent per invoice per business day.
- Added `POST /api/assistant/chat` and `POST /api/assistant/actions/confirm`. Neither imports Prisma or a business repository — the only path to data is a registered tool. Client history is limited to user and assistant turns, so no system message or forged tool result can be injected. `AiProviderError` / `AiConfigError` are converted by `describeAssistantFailure` into a contained assistant error state.
- Added optional `AI_ACTION_SIGNING_SECRET` (falls back to `CLERK_SECRET_KEY`) to `lib/env.ts` and `.env.example`.

Files / Areas:
- `modules/ai/domain/` (`assistant-types.ts`, `assistant-facts.ts`, `assistant-answer.ts`, `assistant-actions.ts`, `action-token.ts`, `tool-types.ts`)
- `modules/ai/application/` (`assistant.ts`, `confirm-action.ts`, `tools/payment-reminders.ts`, `tools/registry.ts`)
- `modules/ai/schemas/` (`assistant.schema.ts`, `ai-tool.schema.ts`), `modules/ai/infrastructure/` (`action-secret.ts`, `tool-context.ts`), `modules/ai/index.ts`
- `app/api/assistant/chat/route.ts`, `app/api/assistant/actions/confirm/route.ts`
- `app/app/(workspace)/assistant/page.tsx`
- `components/assistant/` (`assistant-panel.tsx`, `assistant-answer-view.tsx`, `types.ts`)
- `components/shell/assistant-launcher.tsx`, `components/shell/app-top-bar.tsx`
- `lib/env.ts`, `.env.example`
- `tests/ai/ai-assistant.test.ts`, `tests/ai/ai-tools.test.ts`, `tests/ai/tool-context-fixture.ts`

Tests:
- `npx vitest run` (44 files, 285 tests)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Verification:
- An owner asking "who owes me money?" gets a tenant-scoped answer whose figures are cited to `get_outstanding_receivables`; the same question in another tenant returns only that tenant's balances.
- A role without the tool's permission gets an honest "your role cannot access that" notice, no facts, and a `denied` audit record.
- A proposed reminder creates no notification and no action audit record until the user confirms; confirming from a role without `invoice:update` is rejected; a tampered, foreign-signed, or expired token is refused.
- `AiProviderError` and `AiConfigError` resolve to a 503 assistant error state; the workspace layout, invoice pages, and the launcher never import the AI provider.

Notes:
- Next implementation unit is `29-automated-testing.md`.
- `send_payment_reminders` is the only mutation the assistant can propose, and it reuses existing use cases. Adding another action tool means adding a preview in `previewAiAction` — the loop refuses to propose an action it cannot preview.
- The production build still needs `CLERK_WEBHOOK_SIGNING_SECRET` set; it is empty in the local `.env`, so `npm run build` was verified with a placeholder for that pre-existing variable.

---

## 2026-08-21 — AI Gateway and Tools

Status: Complete

Implemented:
- Added the provider-agnostic AI gateway in `lib/ai/`: a single `AiAdapter` contract (`complete(request)`), an OpenAI chat-completions adapter, and a deterministic stub adapter. `resolveAiConfig` picks the provider from env (`AI_PROVIDER`, `OPENAI_API_KEY`) — no key in dev/test falls back to the stub, while production refuses the stub and a missing key.
- Added six read-only AI tools in `modules/ai/application/tools/`: `get_sales_summary`, `get_expenses_summary`, `get_outstanding_receivables`, `get_overdue_invoices`, `get_low_stock_products`, `get_business_metrics`. Each one calls an existing reporting/dashboard use case; none touches Prisma or SQL directly.
- Added `executeAiTool` / `runAiToolCall`: rejects model-supplied `tenantId`/`userId`/`role`/`permission`, requires authenticated identity plus tenant from the trusted server context, checks the tool's permission against the membership role, validates input and output with Zod, and writes an `ai.tool.invoked` audit record (authorization decision only, never the business payload) for every success, denial, and failure.
- Added prompt-injection defence: a versioned system policy that is always the first and only system message (`buildAiConversation`), and tool results returned to the model inside a sanitized `UNTRUSTED-CONTENT` fence.
- Added AI env vars (`AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `AI_REQUEST_TIMEOUT_MS`) to `lib/env.ts` and `.env.example`.

Files / Areas:
- `lib/ai/` (`types.ts`, `resolve-config.ts`, `openai-adapter.ts`, `stub-adapter.ts`, `create-adapter.ts`, `adapter.ts`, `index.ts`)
- `modules/ai/domain/` (`tool-types.ts`, `define-tool.ts`, `errors.ts`, `identity-guard.ts`, `system-policy.ts`, `untrusted-content.ts`, `tool-output.ts`)
- `modules/ai/application/` (`tools/*`, `execute-tool.ts`, `conversation.ts`, `tool-period.ts`), `modules/ai/schemas/ai-tool.schema.ts`, `modules/ai/infrastructure/tool-context.ts`
- `lib/env.ts`, `.env.example`
- `tests/ai/ai-tools.test.ts`, `tests/ai/ai-gateway.test.ts`, `tests/ai/ai-safety.test.ts`, `tests/ai/tool-context-fixture.ts`

Tests:
- `npx vitest run tests/ai/`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Verification:
- Tools return only the caller's tenant data; a cross-tenant customer id is rejected as not found and audited.
- Tools refuse to run without an authenticated user and tenant, and refuse tools the role lacks permission for.
- Swapping the stub adapter for the OpenAI adapter produces identical tool specs and identical tool results.
- Tool results carrying injected instructions cannot escape the untrusted-content fence or displace the system policy.

Notes:
- Next implementation unit is `28-ai-assistant.md`. The assistant consumes `getAiAdapter()` from `lib/ai`, plus `listAiToolSpecsForRole(role)`, `buildAiConversation()`, `runAiToolCall()`, and `aiToolResultMessage()` from `modules/ai`, and `createAiToolContext()` from `modules/ai/infrastructure/tool-context` (kept out of the `modules/ai` barrel because client dashboard components import it). No mutation tools exist yet, so mutation UX and confirmation flows arrive with spec 28.
- The production build needs `CLERK_WEBHOOK_SIGNING_SECRET` set in the local `.env`; it is currently empty, so `npm run build` was verified with a placeholder value for that pre-existing variable.

---

## 2026-08-20 — Notifications

Status: Complete

Implemented:
- Added `modules/notifications/` with IN_APP channel abstraction, Prisma + memory repositories, outbox consumer (`processOutboxNotifications`), and overdue invoice scan. Notifications are created after commit (never inside the business transaction).
- Domain events → notifications: `SalesInvoiceCreated`, `SalesInvoicePosted`, `PaymentReceived`, inventory movement events (low stock when at/below threshold), overdue invoices (`invoice-overdue:{id}` idempotency).
- Top-bar inbox with unread badge, mark one/all read. APIs: `GET /api/notifications`, `POST /api/notifications/mark-read`, `POST /api/internal/outbox/process` (optional `CRON_SECRET`).
- Post-mutation `scheduleNotificationOutboxProcessing` on invoice create/post, payment, stock adjust/opening, purchase post.

Files / Areas:
- `modules/notifications/`
- `prisma/schema.prisma`, `prisma/migrations/20260821020000_add_notifications/`
- `components/shell/notification-inbox.tsx`, `app-top-bar.tsx`
- `app/api/notifications/**`, `app/api/internal/outbox/process/route.ts`
- `tests/notifications/notifications.test.ts`

Tests:
- `npx vitest run tests/notifications/`
- `npm run typecheck`
- `npm run lint`

Notes:
- Next implementation unit is `27-ai-gateway-tools.md`. Apply the notifications migration before relying on the table in production. Optional `CRON_SECRET` protects the outbox process route in production.

---

## 2026-08-20 — Search

Status: Complete

Implemented:
- Added `modules/search/` with permission-aware `searchBusinessRecords` and Prisma FTS repository querying parties, products, invoices, purchases, payments, and expenses. Search is derived from transactional tables (GIN indexes); not a write path.
- Wired top-bar ⌘K (`WorkspaceCommandMenu`) to `/api/search` for live record results plus page jumps; added `/app/search` with filters and empty/no-match states.
- Sidebar Overview → Search entry.

Files / Areas:
- `modules/search/`
- `app/api/search/route.ts`
- `app/app/(workspace)/search/page.tsx`
- `components/shell/workspace-command-menu.tsx`, `app-sidebar.tsx`
- `prisma/migrations/20260821010000_add_search_fts_indexes/`
- `tests/search/search.test.ts`

Tests:
- `npx vitest run tests/search/`
- `npm run typecheck`
- `npm run lint`

Notes:
- Next implementation unit is `26-notifications.md`. Apply the FTS migration (`prisma migrate deploy` / `db push` as used in this project) before relying on indexes in production.

---

## 2026-08-20 — Reports

Status: Complete

Implemented:
- Extended `modules/reporting/` with sales, expense, profit, receivables, payables, and inventory report queries plus CSV export helpers. Figures come from posted documents / allocations / stock — no GST recalculation and no mutations.
- Reports hub lists all MVP reports. UI under `/app/reports/{sales,expenses,profit,receivables,payables,inventory,gst,ledger,trial-balance}` with date filters where applicable and CSV export routes. Ledger and trial balance reuse `getLedger` / `getTrialBalance` from accounting.
- Nested Reports sidebar entries; permission `report:read`; tenant isolation covered in tests.

Files / Areas:
- `modules/reporting/application/business-reports.ts`, `export-business-reports.ts`
- `modules/reporting/domain/business-report-types.ts`, `csv.ts`
- `app/app/(workspace)/reports/**`
- `app/api/reports/*/export`
- `components/shell/app-sidebar.tsx`
- `tests/reporting/business-reports.test.ts`

Tests:
- `npx vitest run tests/reporting/`
- `npm run typecheck`
- `npm run lint`

Notes:
- Next implementation unit is `25-search.md`.

---

## 2026-08-20 — Dashboard chart, KPI, tabs, and overflow polish

Status: Complete

Implemented:
- Monochrome stacked-area chart with SVG linear gradients (`--chart-1` / `--chart-3`), hidden Y-axis, chart-header segmented filters for Last 7 days / 30 days / 3 months via `?range=`.
- Extended `resolveDashboardDateRange` with those presets; default when omitted is `last_3_months` (`this_month` / `custom` retained).
- KPI cards: top-to-bottom gradient on `DashboardMetricCard` only (shared `Card` unchanged).
- Removed Overview / Reports / Accounting tabs and From/To period form from `/app`; sidebar nav unchanged.
- Constrained `AppTopBar` (min-w-0, org switcher max-width) and `SidebarInset` (`min-w-0 overflow-x-hidden`) to stop horizontal page scroll.

Files / Areas:
- `modules/reporting/domain/dashboard-range.ts`, `schemas/dashboard.schema.ts`
- `components/business/dashboard-area-chart.tsx`, `dashboard-canvas.tsx`, `dashboard-chart-range-filters.tsx`, `dashboard-metric-card.tsx`
- `components/shell/app-top-bar.tsx`
- `app/app/(workspace)/page.tsx`, `layout.tsx`
- Removed `components/business/dashboard-period-toolbar.tsx`
- `tests/reporting/dashboard.test.ts`

Tests:
- `npx vitest run tests/reporting/dashboard.test.ts tests/ai/dashboard-supervisor.test.ts`
- `npm run typecheck`

Notes:
- Reports / Accounting / GST modules untouched beyond shared date-range type expansion.

---

## 2026-08-20 — Supervisor-led dashboard Generative UI

Status: Complete

Implemented:
- Introduced `modules/ai/` Supervisor + four workers (Data Fetcher, Data Analyst, Anomaly Scout, Generative UI Mapper). Facts come from `getDashboardOverview` only; schema + citation quality gate block invented amounts.
- Generative UI: Zod `DashboardViewSchema` → `DashboardCanvas` maps to shadcn Cards/Charts/lists/insight banners (Dashboard-01 structure). Fallback path when orchestration fails.
- Shell: `OrganizationSwitcher` + workspace command menu (⌘K). Dashboard period toolbar with Overview / Reports / Accounting tabs.
- Stub `lib/ai/adapter.ts` for future OpenAI gateway (spec 27).

Files / Areas:
- `modules/ai/`
- `lib/ai/adapter.ts`
- `components/business/dashboard-*.tsx`
- `components/shell/app-top-bar.tsx`, `workspace-command-menu.tsx`
- `app/app/(workspace)/page.tsx`
- `tests/ai/dashboard-supervisor.test.ts`

Tests:
- `npx vitest run tests/ai/`
- `npm run typecheck`

Notes:
- Next feature spec remains `24-reports.md`. Specs `27`/`28` will deepen LLM tooling and assistant chat.

---

## 2026-08-20 — Dashboard

Status: Complete

Implemented:
- Extended `modules/reporting/` with dashboard date-range resolution and `getDashboardOverview`: period sales (taxable), expenses, profit, point-in-time receivables/payables, receipts and supplier payments in period, overdue invoices, low-stock count, recent invoices/expenses, daily sales-vs-expenses series, and attention alerts.
- Replaced the placeholder `/app` dashboard with KPI metric cards, date filter (this month / custom using tenant timezone), Chart primitive bar chart using `--chart-*` tokens, recent tables, and empty state for new businesses. AI insights intentionally not rendered until spec `28`.
- Authorization via `report:read` (unauthenticated users cannot load dashboard data).

Files / Areas:
- `modules/reporting/` (dashboard application, range, types, schema)
- `app/app/(workspace)/page.tsx`
- `components/business/dashboard-sales-chart.tsx`, `dashboard-date-filter.tsx`
- `tests/reporting/dashboard.test.ts`

Tests:
- `npx vitest run tests/reporting/dashboard.test.ts`
- `npm run typecheck`
- `npm run build`

Verification:
- KPIs match seeded invoices/expenses/outstanding for the selected period.
- Empty state works with no data.
- Tenant isolation on totals.
- Production build succeeds.

Notes:
- Next implementation unit is `24-reports.md`.

---

## 2026-08-20 — GST reporting

Status: Complete

Implemented:
- Added `modules/reporting/` GST period summary and CSV export. Totals come from stored CGST/SGST/IGST on posted sales invoices, posted purchases, and taxed expenses — no tax recalculation in the report layer.
- Extended `modules/tax` with `sumStoredGst` / `storedHeaderMatchesLines` for summing and checking persisted breakdowns only.
- Reports UI: hub at `/app/reports`, GST summary at `/app/reports/gst` (period filter, output/input metrics, transaction table). CSV via `/api/reports/gst/export`. Permission `report:read`. Nested Reports nav.
- Draft/cancelled documents and untaxed expenses are excluded. Cross-tenant rows never appear in another tenant’s summary/export.

Files / Areas:
- `modules/reporting/`
- `modules/tax/domain/sum-stored-gst.ts`
- `app/app/(workspace)/reports/`
- `app/api/reports/gst/export/route.ts`
- `components/shell/app-sidebar.tsx`
- `tests/reporting/gst-reporting.test.ts`

Tests:
- `npx vitest run tests/reporting/`
- `npm run typecheck`
- `npm run build`

Verification:
- GST summary for a period matches sum of posted document tax breakdowns.
- Export is tenant-scoped.
- No filing / e-invoice / GSTR integration.
- Production build succeeds.

Notes:
- Next implementation unit is `23-dashboard.md`.

---

## 2026-08-20 — Accounting workspace

Status: Complete

Implemented:
- Extended `modules/accounting/` with journal list/ledger/trial-balance queries, period close (`assertCanClosePeriod` + `Business.closedThroughPeriodKey`), and workspace use cases for adjustments and audited reversals. Posted journals remain immutable.
- `BusinessProfile.closedThroughPeriodKey` mapped end-to-end; workspace financial post actions pass the tenant closed-through key into `postJournal`.
- Accounting UI under `/app/accounting`: overview, chart of accounts, journals (list/detail/adjustment), ledger, trial balance, periods. Nested Accounting nav. Money via `MoneyDisplay`.
- Permissions: `report:read` for reads; `accounting:post` for reverse, adjustment, and period close.

Files / Areas:
- `modules/accounting/` (workspace use cases, period-close, schemas, repo query methods)
- `modules/tenant/` (`closedThroughPeriodKey` on profile + `setClosedThroughPeriodKey`)
- `app/app/(workspace)/accounting/`
- `components/business/post-adjustment-form.tsx`, `reverse-journal-form.tsx`, `close-period-form.tsx`
- `components/shell/app-sidebar.tsx`
- `app/app/(workspace)/*/actions.ts` (closed-through wiring)
- `tests/accounting/workspace.test.ts`

Tests:
- `npx vitest run tests/accounting/`
- `npm run typecheck`

Verification:
- Trial balance balances for posted activity.
- Posted journal cannot be edited; reversal creates a new balanced journal.
- Closed period rejects new posts.
- Cross-tenant ledger access is rejected.

Notes:
- Next implementation unit is `22-gst-reporting.md`.

---

## 2026-08-20 — Customer payments

Status: Complete

Implemented:
- Added `modules/payments/` customer receipts and allocation lines. Record a payment against one or more unpaid/partial invoices in the same tenant. Partial and full payment. Over-allocation is rejected.
- Invoice payment status and customer outstanding are derived from allocations, not a stored balance. Posted invoice line amounts are not mutated.
- Atomic use case: payment + allocations + balanced journal (Dr Cash for cash, Dr Bank for UPI/bank transfer/card/cheque, Cr Receivable) + audit + outbox (`PaymentReceived`).
- Methods: Cash, UPI, Bank Transfer, Card, Cheque as labels only. No payment gateway. Unallocated remainder is not recorded (full payment amount must be allocated).
- Prisma `CustomerPayment`, `CustomerPaymentAllocation`, `CustomerPaymentNumberSeries`. Migration `20260820060000_add_customer_payments`. Number series `RCP/{FY}/{seq}`.
- Permissions `payment:create` / `payment:read`. Sales → Payments list/detail/record UI. Invoice detail “Record payment” plus payment history. Customer outstanding from remainders.

Files / Areas:
- `modules/payments/`
- `modules/sales/` (receivable status, invoice list filters, row lock for allocation)
- `prisma/schema.prisma`
- `prisma/migrations/20260820060000_add_customer_payments/`
- `app/app/(workspace)/sales/payments/`
- `app/app/(workspace)/sales/invoices/[id]/page.tsx`
- `app/app/(workspace)/sales/customers/[id]/page.tsx`
- `components/business/record-payment-form.tsx`
- `tests/payments/payments.test.ts`

Tests:
- `npm test` (173 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Partial payment leaves remaining outstanding and marks the invoice partially paid.
- Full payment marks the invoice paid; customer outstanding matches unpaid remainders.
- Over-allocation is rejected (unit + workflow tests).
- Receipt journal balances.
- Cross-tenant payment get-by-id and allocation are rejected.
- Production build succeeds.

Notes:
- Next implementation unit is `18-expenses.md`.

---

## 2026-08-20 — Sales invoices UI

Status: Complete (UI layer; spec `16` domain/posting may still need Prisma generate)

Implemented:
- Sales → Invoices UI mirroring quotations: list with search/status filter, create/edit forms (`dueOn`), detail with GST breakdown and payment status label.
- Server actions: create, update, post (inventory + accounting in transaction), cancel draft, export PDF (documents storage).
- Components: `invoice-form`, `invoice-status-badge`, `invoice-status-actions`.
- Quotation conversion wired: `convertQuotationAction` calls `convertQuotationToInvoice`; Convert button enabled for `ACCEPTED` only and redirects to the new invoice.

Files / Areas:
- `app/app/(workspace)/sales/invoices/`
- `components/business/invoice-form.tsx`
- `components/business/invoice-status-badge.tsx`
- `components/business/invoice-status-actions.tsx`
- `app/app/(workspace)/sales/quotations/actions.ts` (convert)
- `components/business/quotation-status-actions.tsx`

---

## 2026-08-20 — Sales quotations

Status: Complete

Implemented:
- Added `modules/sales/` quotations: domain types/status transitions, money×quantity pricing, tax-engine GST per line, memory + Prisma repositories, and use cases (create, update draft, get, list/search, send, accept, cancel).
- Per-tenant quotation numbers `QT/FY2026-27/0001` via `quotation_number_series`. Amounts are money primitives; quantities use inventory quantity scale.
- Prisma `Quotation`, `QuotationLine`, `QuotationNumberSeries`. Migration `20260820040000_add_quotations`.
- Permissions `quotation:create` / `read` / `update` / `cancel`. Audit + outbox (`QuotationCreated` / `Updated` / `Sent` / `Accepted` / `Cancelled`).
- Sales → Quotations UI: list with “New quotation”, create/edit forms, detail with stored GST preview. Convert-to-invoice is stubbed until spec `16`. Quotations do not move stock or post journals.

Files / Areas:
- `modules/sales/`
- `prisma/schema.prisma`
- `prisma/migrations/20260820040000_add_quotations/`
- `app/app/(workspace)/sales/quotations/`
- `components/business/quotation-form.tsx`
- `components/business/gst-breakdown.tsx`
- `components/shell/app-sidebar.tsx`
- `lib/security/permissions.ts`
- `tests/sales/quotations.test.ts`

Tests:
- `npm test` (155 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Owner can create a quotation with lines, line discount, and GST matching `calculateGst`.
- Creating a quotation does not append inventory movements.
- Cross-tenant get-by-id is rejected (`QuotationNotFoundError`).
- Production build succeeds.

Notes:
- Conversion to invoice is spec `16` only.
- Next implementation unit is `17-customer-payments.md`.

---

## 2026-08-20 — Inventory movements

Status: Complete

Implemented:
- Added `modules/inventory/` with quantity primitives (scale 4, integer minor units), movement types, memory + Prisma repositories, and use cases for opening stock, adjustments, derived current stock, low-stock listing, and movement history.
- Public `recordInventoryMovement` interface for later sale stock-out and purchase stock-in. Only inventory-tracked products participate. Direct balance mutation is not part of the public API.
- Prisma `InventoryMovement` (append-only) plus `Business.lowStockThreshold` (`DECIMAL(18,4)`, default 5). Migration `20260820030000_add_inventory_movements`.
- Inventory → Stock UI: list with low-stock alert/filter, product stock page with opening/adjust forms (`inventory:adjust`) and movement history. Product detail shows derived quantity.
- Audit + outbox `InventoryOpened` / `InventoryAdjusted` / `InventoryMoved`. Cross-tenant get-by-id is rejected.

Files / Areas:
- `modules/inventory/`
- `prisma/schema.prisma`
- `prisma/migrations/20260820030000_add_inventory_movements/`
- `app/app/(workspace)/inventory/stock/`
- `app/app/(workspace)/inventory/products/[id]/page.tsx`
- `components/business/opening-stock-form.tsx`
- `components/business/adjust-stock-form.tsx`
- `components/business/low-stock-alert.tsx`
- `modules/tenant/` (low-stock threshold)
- `tests/inventory/inventory.test.ts`

Tests:
- `npm test` (147 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Opening stock and adjustments change derived quantity through movements only.
- No public `setStock` / `updateStockBalance` use case.
- Low-stock products can be listed against the tenant threshold.
- Cross-tenant stock access is rejected (`InventoryProductNotFoundError`).
- Production build succeeds.

Notes:
- Opening-stock accounting journals are deferred to specs `16`/`19` so inventory valuation posts with those documents rather than inventing a standalone opening journal here.
- Next implementation unit is `15-quotations.md`.

---

## 2026-08-20 — Products catalog

Status: Complete

Implemented:
- Added `modules/catalog/` for products and services: domain types, GSTIN-style HSN/SAC validation, money prices, Zod boundary schema, memory + Prisma repositories, and use cases (create, update, get, list/search).
- Prisma `Product` with `DECIMAL(18,2)` selling/purchase prices, SKU unique per tenant (`@@unique([tenantId, sku])`), tax rate stored as bps (no GST calculation in the catalog UI).
- Inventory → Products UI: list with “New product”, kind/search filters, create/edit forms, detail page. Tracked items show stock `0` / “No stock movements yet”; untracked items show no fake quantity. Services never track inventory.
- Audit + outbox `ProductCreated` / `ProductUpdated`. Cross-tenant get-by-id is rejected.

Files / Areas:
- `modules/catalog/`
- `prisma/schema.prisma`
- `prisma/migrations/20260820020000_add_catalog_products/`
- `app/app/(workspace)/inventory/products/`
- `components/business/product-form-fields.tsx`
- `components/business/create-product-form.tsx`
- `components/business/edit-product-form.tsx`
- `lib/db/client.ts`
- `tests/catalog/products.test.ts`

Tests:
- `npm test` (136 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Owner can create a product with SKU, unit, prices, HSN/SAC, tax rate, and inventory flag in-tenant.
- Same SKU is allowed in another tenant; duplicate SKU in the same tenant is rejected.
- Production build succeeds.

Notes:
- Stock movements are spec `14`. Next implementation unit is `14-inventory.md`.

---

## 2026-08-20 — Shadcn blocks theme and dark mode

Status: Complete

Implemented:
- Rewrote `context/ui-context.md` Theme / Colors / Dark Mode / Typography / Layout / Sidebar / Top Bar / Cards / Tables / Charts / Buttons for shadcn blocks (zinc/neutral, black/white primary). Indian ₹ and financial state colors unchanged.
- Replaced `app/globals.css` `:root` / `.dark` with nova-neutral oklch tokens; `--bg-*` / `--text-*` / `--accent-primary` alias onto shadcn variables. Chart series grayscale + one accent.
- Added `next-themes` (`ThemeProvider`, `suppressHydrationWarning` on `<html>`). Theme toggle (Light / Dark / System) on the workspace top bar, public header, sign-in/sign-up, and setup.
- Restyled shell and existing screens (dashboard tenant fact cards, list table shells, empty/error/coming-soon, settings/forms) without fake KPIs.

Files / Areas:
- `context/ui-context.md`
- `app/globals.css`
- `app/layout.tsx`
- `components/shell/`
- `app/app/(workspace)/`
- `package.json` / `package-lock.json`

Tests:
- `npm run lint`
- `npm run typecheck`

Verification:
- Light and dark use high-contrast primary (not blue).
- Theme toggle persists via `next-themes` / `localStorage`.
- Customers, suppliers, products, settings, dashboard, and coming-soon remain readable in both themes.

Notes:
- Next implementation unit remains `14-inventory.md`.

---

## 2026-08-20 — Comfortable density and theme toggle

Status: Complete

Implemented:
- Theme menu uses `DropdownMenuItem` + `setTheme` (Light / Dark / System) with `w-auto min-w-40` so the popup is not clipped to the icon trigger. `ThemeProvider` lists explicit themes.
- Default primitives stepped up one size: buttons/inputs/selects `h-9`, sidebar rows `h-9` / nested `h-8`, table `h-11` / `px-3 py-2.5`, dropdown items `px-2 py-1.5`. Top bar `h-16`.
- `ui-context.md` documents comfortable density and the item-based theme menu.

Files / Areas:
- `components/shell/theme-toggle.tsx`
- `components/shell/theme-provider.tsx`
- `components/shell/app-top-bar.tsx`
- `components/ui/button.tsx`, `input.tsx`, `select.tsx`, `table.tsx`, `sidebar.tsx`, `dropdown-menu.tsx`, `textarea.tsx`
- `context/ui-context.md`
- `context/progress-tracker.md`

Tests:
- `npm run lint`
- `npm run typecheck`

Verification:
- Light, Dark, and System apply from the top-right menu and persist on reload.
- Controls and sidebar rows are a step larger without navigation or page-structure changes.

Notes:
- Next implementation unit remains `14-inventory.md`.

---

## 2026-08-20 — h-10, text-base, rounded-md

Status: Complete

Implemented:
- Default controls `h-10` / `text-base` / `rounded-md`; icons `size-5`; icon buttons `size-10`.
- Sidebar `18rem` (mobile `20rem`), rows `h-10`, nested `h-9`. Body copy `text-base`; captions/GSTIN/SKU stay `text-xs`. Badges stay pills.
- Cards, dialogs, menus, and list table shells use `rounded-md`.

Files / Areas:
- `components/ui/`
- `components/shell/`
- `components/business/`
- `app/app/(workspace)/`
- `context/ui-context.md`

Tests:
- `npm run lint`
- `npm run typecheck`

Verification:
- Buttons, inputs, selects, and sidebar rows are `h-10` with 16px type.
- Surfaces are `rounded-md`; metadata lines remain `text-xs`.

Notes:
- Next implementation unit remains `14-inventory.md`.

---

## 2026-08-20 — Suppliers

Status: Complete

Implemented:
- Extended `modules/party/` with supplier use cases in the same module as customers. Shared GSTIN/address Zod schemas and normalization.
- Prisma `Party` `SUPPLIER` kind; queries always include `tenantId` and `kind: SUPPLIER`. Payable outstanding is not stored.
- Purchases → Suppliers UI: list with “New supplier”, search/status filters, create/edit forms, detail page with GST/contact/address and payable placeholder (`₹0` and “No bills yet”).
- Audit + outbox events `SupplierCreated`, `SupplierUpdated`, `SupplierDeactivated`. Cross-tenant get-by-id is rejected; customer IDs are not treated as suppliers.

Files / Areas:
- `modules/party/`
- `app/app/(workspace)/purchases/suppliers/`
- `components/business/create-supplier-form.tsx`
- `components/business/edit-supplier-form.tsx`
- `components/business/deactivate-supplier-button.tsx`
- `tests/party/suppliers.test.ts`

Tests:
- `npm test` (122 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Owner can create, edit, view, list, search, and deactivate a supplier in-tenant.
- Another tenant cannot load a supplier by ID (`PartyNotFoundError`).
- Payable is a UI placeholder, not a ledger field.
- Production build succeeds.

Notes:
- Next implementation unit is `13-products-catalog.md`.

---

## 2026-08-19 — Customers

Status: Complete

Implemented:
- Added `modules/party/` for the customer vertical slice: domain types/errors, GSTIN-aware normalization, Zod boundary schemas, memory + Prisma repositories, and use cases (create, update, get, list/search, deactivate).
- Prisma `Party` model with `PartyKind` and `PartyStatus`; queries always include `tenantId` and `kind: CUSTOMER`. Outstanding is not stored.
- Sales → Customers UI: list with “New customer”, search/status filters, create/edit forms, detail page with GST/contact/address and outstanding placeholder (`₹0` and “No invoices yet”).
- Audit + outbox events `CustomerCreated`, `CustomerUpdated`, `CustomerDeactivated`. Cross-tenant get-by-id is rejected.

Files / Areas:
- `modules/party/`
- `prisma/schema.prisma`
- `prisma/migrations/20260819233000_add_customers/`
- `app/app/(workspace)/sales/customers/`
- `components/business/customer-form-fields.tsx`
- `components/business/deactivate-customer-button.tsx`
- `lib/db/client.ts`
- `tests/party/customers.test.ts`

Tests:
- `npm test` (114 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Owner can create, edit, view, list, search, and deactivate a customer in-tenant.
- Another tenant cannot load a customer by ID (`PartyNotFoundError`).
- Invalid GSTIN is rejected. Outstanding is a UI placeholder, not a ledger field.
- Production build succeeds.

Notes:
- Suppliers share `modules/party/` later (`12-suppliers.md`); this spec ships customers only.
- Next implementation unit is `12-suppliers.md`.

---

## 2026-08-19 — Documents and object storage

Status: Complete

Implemented:
- Added `lib/storage/` with a swappable adapter (upload/download/delete), local/dev filesystem implementation, in-memory test adapter, and Cloudflare R2 production adapter (`@aws-sdk/client-s3`).
- Adapter selection fails closed in production: missing/invalid R2 config throws; local storage cannot be selected when `NODE_ENV=production`.
- Added tenant-scoped `Document` metadata in PostgreSQL and `modules/documents/` use cases for upload, download, list, and delete. Content type is sniffed from bytes; client paths and claimed MIME types are not trusted.
- Authorized Settings → Documents upload/download UI using the existing Attachment primitive. Downloads are forced as attachments.
- Added `document:upload`, `document:read`, and `document:delete` permissions; important uploads are audited.

Files / Areas:
- `lib/storage/`
- `lib/env.ts`
- `modules/documents/`
- `lib/security/permissions.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260819170000_add_documents/`
- `app/app/(workspace)/settings/documents/`
- `app/api/documents/[id]/route.ts`
- `components/business/upload-document-form.tsx`
- `components/business/document-attachment-list.tsx`
- `tests/storage/`
- `tests/documents/`

Tests:
- `npm test` (107 tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Tenant can upload and download the same bytes; another tenant cannot read by document ID.
- Oversized files and disallowed types (including PDF magic with a `.exe` name) are rejected.
- Production adapter config without R2 credentials throws; local driver is rejected in production.
- Production build succeeds. `components/ui/*` was not modified.

Notes:
- Local storage root defaults to `.data/storage` (gitignored). Production must set `STORAGE_DRIVER=r2` plus Cloudflare R2 env vars.
- Owner types include future records (expense/invoice/etc.) without foreign keys; `BUSINESS` attachments must use the current tenant id.
- Next implementation unit is `11-customers.md`.

---
## 2026-08-19 — Owner product decisions

Status: Complete *(documentation only)*

Implemented:
- Recorded accepted decisions: Neon PostgreSQL, Cloudflare R2, OpenAI + adapter, multi-user from foundation, payment methods (Cash/UPI/Bank Transfer/Card/Cheque), GST-ready not filing, simple Indian double-entry, Clerk Organizations as workspace boundary.
- Updated feature specs `02`–`05`, `08`–`10`, `16`–`24`, `27`–`30` and architecture/progress tracker so implementers do not re-open these questions.
- Reviewed completed implementations for specs `01`–`03`: **no code rewrite required**. Spec `02` still correctly uses local Postgres (Neon is spec `30`). Spec `03` still correctly maps Clerk **users** only; Organization → Business is spec `04`. Verified Clerk Organizations feature on the linked instance (`clerk enable orgs` → no changes; already enabled). Updated `.env.example` comments for accepted vendors.

Files / Areas:
- `context/feature-specs-mvp/`
- `context/progress-tracker.md`
- `context/architecture-context.md`
- `.env.example`

Tests:
- None (docs only).

Verification:
- Open Questions list is empty; decisions live under Architecture Decisions.
- Previous auth/foundation checklists still pass under the revised specs.

Notes:
- Next implementation unit remains `04-tenant-business-setup.md`, now with Clerk Organizations + multi-user in scope.

---

## 2026-08-19 — Authentication — Clerk

Status: Complete

Implemented:
- Installed `@clerk/nextjs` v7 and `@clerk/ui` (shadcn theme) for App Router authentication.
- Added `ClerkProvider` in the root layout with Clerk-provided sign-in, sign-up, and `UserButton` sign-out controls.
- Added Next.js 16 `proxy.ts` using `clerkMiddleware()`; public routes are `/`, `/sign-in`, `/sign-up`, and `/api/webhooks/clerk`. All other routes fail closed via `auth.protect()`.
- Added `lib/auth/` for trusted server-side current-user resolution. Application identity is mapped from the Clerk user id, never from a client-supplied `userId`.
- Added Prisma `User` (`clerkUserId` unique) and an idempotent webhook handler for `user.created` / `user.updated` / `user.deleted` using `verifyWebhook`.
- Typed Clerk env vars in `lib/env.ts`. Secret keys remain server-only.
- Added Vitest authentication tests and ESLint import restrictions so `modules/` cannot import Clerk.
- Aligned the Prisma CLI with Prisma 7 so the production build can import the generated client.

Files / Areas:
- `lib/auth/`
- `lib/env.ts`
- `proxy.ts`
- `app/layout.tsx`
- `app/sign-in/`, `app/sign-up/`, `app/app/`
- `app/api/webhooks/clerk/route.ts`
- `app/api/me/route.ts`
- `prisma/schema.prisma`
- `tests/auth/`
- `.github/workflows/ci.yml`
- `.env.example`

Tests:
- `npm test` (11 auth tests)
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification:
- Unauthenticated access to `/app` and `/api/me` is blocked by middleware (`auth.protect()`).
- `/api/me` returns 401 if `requireCurrentUser()` runs without a Clerk session.
- Webhook verification failures return 400; user lifecycle upserts/deletes are idempotent.
- Production build succeeds. Domain modules do not import `@clerk/nextjs`.

Notes:
- Clerk Organizations are accepted as the workspace boundary; Organization → Business mapping is spec `04`.
- Current-user mapping upserts on first authenticated request so sign-up does not wait on webhook delivery. Webhooks still keep the mapping in sync for lifecycle events.
- Replace the Clerk placeholder keys in `.env` / `.env.local` with a real Clerk application (`npx clerk@latest init` or Dashboard keys) before testing the hosted sign-in UI.
- Next implementation unit is `04-tenant-business-setup.md`.

---

## 2026-08-19 — Project Foundation

Status: Complete

Implemented:
- Added Zod-validated environment config (`DATABASE_URL`, `NODE_ENV`).
- Created architecture folder boundaries with `.gitkeep` barrels.
- Installed Prisma 7 with `@prisma/adapter-pg` against local PostgreSQL.
- Added a minimal schema (generator + datasource only) and `lib/db` Prisma client helper.
- Added `db:generate`, `db:migrate`, `typecheck`, and `lint:fix` scripts.
- Added GitHub Actions workflow for lint, typecheck, and production build.
- Did not wire a production PostgreSQL host in this unit (later accepted: Neon).

Files / Areas:
- `lib/env.ts`
- `lib/db/`
- `prisma/schema.prisma`
- `prisma.config.ts`
- `.github/workflows/ci.yml`
- `.env.example`
- `package.json`
- architecture folders (`modules/`, `lib/*`, `tests/`, `workers/`, `components/business/`)

Tests:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npx prisma generate`
- `npx prisma migrate status` (connected to local `ai_business_os`)

Verification:
- Lint, typecheck, and production build succeed.
- Prisma generated the client and connected to local PostgreSQL at `localhost:5432`.
- Folder structure matches architecture boundaries.

Notes:
- Empty schema produced no SQL migration; connection and generate both succeed.
- Next implementation unit is `03-authentication-clerk.md`.

---

## 2026-08-19 — Feature Spec Catalog

Status: Complete *(documentation only — no product features implemented)*

Implemented:
- Added `context/feature-specs-mvp/README.md` with execution order and spec template.
- Created implementable specs `02` through `30` matching `01-design-system.md` style.

Files / Areas:
- `context/feature-specs-mvp/`
- `context/progress-tracker.md`

Tests:
- None (docs only).

Verification:
- Catalog contains `01`–`30` plus README (31 files).

Notes:
- Next implementation unit is `02-project-foundation.md`.
- Do not skip numbered dependencies.

---

## 2026-08-19 — Design System and UI Primitives

Status: Complete

Implemented:
- Installed and configured shadcn/ui with Tailwind CSS v4.
- Installed `lucide-react` and created `lib/utils.ts` with `cn()`.
- Added all specified shadcn UI primitives via CLI.
- Added composed Data Table and Date Picker patterns (not standalone registry items).
- Mapped UI context design tokens onto shadcn semantic CSS variables in `app/globals.css`.

Files / Areas:
- `components.json`
- `lib/utils.ts`
- `components/ui/*` (generated by shadcn CLI — not modified after install)
- `components/data-table/*`
- `components/date-picker.tsx`
- `components/design-system-verify.tsx`
- `hooks/use-mobile.ts`
- `app/globals.css`
- `package.json`

Tests:
- `npm run lint`
- `npm run build`

Verification:
- Production build and TypeScript check pass.
- All design-system components import without errors via `components/design-system-verify.tsx`.
- `cn()` merges conflicting Tailwind classes correctly.

Notes:
- Toast uses the shadcn `@base-ui/react/toast` implementation (`components/ui/toast.tsx`).
- Data Table and Date Picker follow official shadcn composition patterns outside `components/ui/`.
- Deferred components from the spec remain available to add later via `npx shadcn@latest add`.

---

Every meaningful implementation unit should be recorded.

Use:

```text
## YYYY-MM-DD — [Feature / Unit]

Status: Complete

Implemented:
- [Change]
- [Change]
- [Change]

Files / Areas:
- [Relevant area]

Tests:
- [Tests added/run]

Verification:
- [How it was verified]

Notes:
- [Important implementation detail]
```

---

# Session Notes

The next AI/developer session must read:

1. `Project overview.md`
2. `Architecture.md`
3. `UI-Context.md`
4. `Coding standards.md`
5. `AI-workflow rules.md`
6. `Progress tracker.md`

before modifying the codebase.

For Clerk-related work, the AI/developer must also:

7. Use the relevant installed Clerk Skill.
8. Consult current Clerk documentation where the implementation depends on current Clerk behavior.

At the beginning of every session:

```text
Read Context
 ↓
Read Progress
 ↓
Identify Current Goal
 ↓
Select ONE Implementation Unit
 ↓
Implement
 ↓
Test
 ↓
Verify Architecture/Invariants
 ↓
Update Progress Tracker
```

Do not begin by implementing an arbitrary feature.

---

# Resume Instructions

If development is resumed in a new session:

* Treat `Completed` as authoritative.
* Treat `In Progress` as unfinished work.
* Treat `Next Up` as the default next implementation target.
* Read `Open Questions` before making architectural assumptions.
* Read `Architecture Decisions` before changing foundational behavior.
* For Clerk-related work, use the relevant Clerk Skill before implementation.
* Do not redo completed work unless a defect requires it.
* Inspect the existing code before making changes.
* Preserve existing working behavior.
* Update this file after the work is verified.

---

# Change Discipline

When implementing a feature:

```text
One Feature
     ↓
Smallest Useful Unit
     ↓
Implement
     ↓
Test
     ↓
Verify
     ↓
Update Tracker
     ↓
Next Unit
```

Do not implement multiple unrelated features simply because they are in the same business domain.

---

# Definition of Done

A feature is **Complete** only when:

1. The feature works end-to-end within its defined scope.
2. The UI follows `UI-Context.md`.
3. The architecture follows `Architecture.md`.
4. The implementation follows `Coding standards.md`.
5. The AI follows `AI-workflow rules.md`.
6. Authentication/authorization is enforced.
7. Tenant isolation is preserved.
8. Financial invariants are preserved where applicable.
9. Validation exists at system boundaries.
10. Appropriate tests exist.
11. Error/loading/empty states are handled.
12. Production build succeeds.
13. No unrelated behavior was broken.
14. Documentation is synchronized.
15. This progress tracker is updated.

For authentication features specifically:

16. Clerk integration follows the relevant Clerk Skill and current Clerk implementation guidance.
17. Server-side authentication boundaries are verified.
18. Clerk secrets are never exposed to clients.
19. Application authorization is not delegated solely to frontend visibility or authentication state.

---

# MVP Completion Criteria

The MVP is considered **Complete** when a small Indian business owner can perform the following journey without manual database intervention:

```text
Create Account
      ↓
Create Business
      ↓
Add Customer
      ↓
Add Product
      ↓
Add Opening Stock
      ↓
Create Invoice
      ↓
Calculate GST
      ↓
Record Payment
      ↓
View Outstanding
      ↓
Record Expense
      ↓
Record Purchase
      ↓
Update Inventory
      ↓
View Dashboard
      ↓
View Reports
      ↓
Ask AI Business Assistant
```

And the system can reliably answer:

```text
How much did I sell?
How much did I spend?
How much profit did I make?
Who owes me money?
Who do I owe?
What is my current stock?
What are my overdue invoices?
What are my biggest expenses?
What GST-related sales/purchase data do I have?
What requires my attention?
```

**The MVP is not complete merely because all screens exist.**

It is complete when the **underlying business workflows work correctly from beginning to end.**
