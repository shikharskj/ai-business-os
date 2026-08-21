# AI Business OS — Project Overview

## Overview

AI Business OS is an **AI-native business companion** for small Indian businesses — retailers, wholesalers, distributors, service businesses, traders, and small manufacturers. Underneath, it keeps correct books: customers, suppliers, products, sales, purchases, expenses, inventory, payments, basic accounting, and GST-ready reporting. On top, it continuously understands what is happening, tells the owner what matters, recommends what to do, and automates routine work through controlled tools.

It is intentionally **not** a feature-parity clone of billing ERPs. Coverage is the essential 80% of SME workflows; the moat is:

```text
Business data → understanding → recommendations → automation → actions → learning
```

**Product phase:** MVP feature specs `01`–`28` are complete (system of record + thin AI copilot). Active horizon is **Post-MVP** per [`context/product-roadmap.md`](product-roadmap.md). After that roadmap, see [`context/future-scope.md`](future-scope.md).

## Goals

1. Provide a single application through which a small Indian business can manage day-to-day sales, purchases, expenses, inventory, customers, suppliers, payments, and basic financial records.
2. Continuously understand business state (revenue, cash, receivables, payables, inventory risk, attention) — not only on-demand reports.
3. Tell the owner what matters via a Daily Brief / attention surface, and answer natural-language questions with grounded facts, explanations, and next actions.
4. Automate routine work (starting with collections) under explicit autonomy levels, confirmation, audit, and idempotency.
5. Maintain reliable and auditable business data with validation, authorization, transaction integrity, and tenant isolation.
6. Keep a modular monolith that is simple to operate at ~10k tenants, with a clean path to expand intelligence and automation without rewriting the truth engine.

## Core User Flow

1. User creates an account and signs in.
2. User creates or selects their business.
3. User completes basic business setup including business name, contact details, address, GSTIN, financial year, and tax configuration.
4. User creates or imports customers and suppliers.
5. User creates products and services with units, prices, tax rates, and optional inventory tracking.
6. User records business transactions such as quotations, sales invoices, purchases, expenses, and payments.
7. The system validates the transaction and updates balances, inventory, tax information, financial records, and emits domain events.
8. User opens the dashboard to view KPIs and a **Needs attention / Daily Brief** surface ranked from business state.
9. User opens reports to understand business performance and GST-related information.
10. User asks the AI assistant natural-language questions; answers use authorized tools and business state, distinguishing facts from recommendations.
11. The Operator recommends actions; for mutations, the user reviews a preview and confirms (or automation runs within L4 policy limits).
12. All important business mutations and AI-initiated actions are recorded in the audit history; automation outcomes feed learning hooks.

## Features

### Authentication & Business Setup

- User registration and sign-in.
- Business/workspace creation.
- Basic business profile management.
- GSTIN and Indian business information.
- Financial year configuration.
- Basic user and permission management.
- Secure tenant isolation between businesses.

### Customer Management

- Create, view, edit, and deactivate customers.
- Store contact information and addresses.
- Store GSTIN and tax-related information.
- Track customer receivables.
- View customer transaction history.
- View customer outstanding balance.
- Search and filter customers.

### Supplier Management

- Create, view, edit, and deactivate suppliers.
- Store contact information and addresses.
- Store GSTIN and tax-related information.
- Track supplier payables.
- View supplier transaction history.
- View supplier outstanding balance.
- Search and filter suppliers.

### Product & Service Management

- Create products and services.
- Define SKU/item codes.
- Define units of measurement.
- Configure selling and purchase prices.
- Configure GST/tax rates.
- Categorize products.
- Enable or disable inventory tracking.
- View stock availability for inventory-tracked products.
- Search and filter products.

### Sales

- Create quotations.
- Convert quotations into sales invoices.
- Create sales invoices directly.
- Add products or services to invoices.
- Apply discounts.
- Calculate applicable GST.
- Support CGST, SGST, and IGST where applicable.
- Record payment status.
- Track unpaid and partially paid invoices.
- View sales transaction history.
- Print or export invoices.

### Purchases

- Create purchase records.
- Record supplier purchases.
- Add products or services to purchase transactions.
- Record applicable purchase taxes.
- Track supplier invoices.
- Track unpaid and partially paid purchases.
- Update inventory for stock purchases.
- View purchase transaction history.

### Expenses

- Record business expenses.
- Categorize expenses.
- Record expense date, amount, tax, and payment information.
- Attach supporting documents.
- View expense history.
- Filter expenses by category and date.
- Include expenses in basic financial reporting.

### Payments & Outstanding

- Record customer payments.
- Record supplier payments.
- Track invoice-level payment status.
- Support partial payments.
- Calculate outstanding receivables.
- Calculate outstanding payables.
- Provide customer and supplier aging information at a basic level.
- Maintain payment transaction history.

### Inventory

- Track stock for inventory-enabled products.
- Increase stock through purchases and receipts.
- Reduce stock through sales.
- Record manual stock adjustments.
- View current stock levels.
- Identify low-stock products.
- View basic stock movement history.

### Basic Accounting

- Maintain a chart of accounts appropriate for the product.
- Record basic double-entry accounting effects for supported transactions.
- Maintain journal entries and ledger records.
- Track income and expenses.
- Track receivables and payables.
- Maintain basic accounting periods.
- Prevent unauthorized modification of posted financial transactions.
- Support transaction reversals/adjustments rather than destructive editing.

### GST & Indian Tax

- Store business GSTIN.
- Store customer and supplier GSTINs.
- Support HSN/SAC information.
- Support CGST, SGST, and IGST calculations.
- Store tax information on applicable transactions.
- Track input and output GST at a basic level.
- Provide GST-oriented summaries and reports.
- Export GST-relevant transaction data for further filing/reconciliation.
- Keep tax rules configurable and effective-date aware where practical.
- Remain **GST-ready**, not a GST-filing platform (see out of scope).

### Dashboard & Reporting

- Business overview dashboard.
- Sales, purchase, expense, receivables, payables, cash/payment, inventory, profit, and GST-oriented summaries.
- Date-based filtering.
- Basic charts and business KPIs.
- Exportable reports where practical.

### Business Intelligence & Attention

- Domain events from business mutations (outbox).
- Derived business state projections (cash position, receivables risk, inventory risk, attention queue).
- Ranked **Needs attention** items shared by dashboard and assistant.
- Outcome hooks for dismissals and automation results (learning foundation).

### Daily Brief & Operator

- Proactive Daily Brief summarizing yesterday and what needs attention.
- Recommended actions with clear autonomy cues (inform / recommend / prepare / confirm / auto-within-policy).
- Deterministic brief from business state when the AI provider is unavailable.

### Search

- Search customers, suppliers, products, invoices, purchases, payments, and expenses.
- Filter by date, status, amount, party, category, and other relevant fields.
- Unified global search for common business records.

### Documents

- Upload documents and attachments.
- Attach documents to supported business records.
- Store documents securely.
- View and download authorized documents.
- Maintain document metadata.
- Support invoice/receipt attachments and expense evidence.
- Post-MVP: document intelligence preparing postings (roadmap R7).

### Notifications

- In-app notifications.
- Important transaction notifications.
- Outstanding-payment reminders.
- Low-stock notifications.
- Basic system notifications.
- Architecture allows future email, SMS, and WhatsApp integrations ([`future-scope.md`](future-scope.md)).

### AI Business Assistant (Copilot)

- Ask questions about business data using natural language.
- Answer from authorized tools and business state (sales, purchases, expenses, parties, inventory, payments, outstanding).
- Summarize performance; explain reports; distinguish facts from recommendations.
- Deepen into **why** and **what should I do** (roadmap R3).
- Use authorized tools rather than unrestricted database access.

### Automation & AI Business Actions

- Autonomy levels L0–L4 (inform → recommend → prepare → confirm → auto within policy).
- Limited approved actions through tools; authorization on every mutation.
- Human confirmation for L3; L4 only behind explicit tenant policy.
- Audit trail and idempotent execution.
- Automation engine: event → condition → reasoning → action → result → outcome (collections first).
- Prevent AI from bypassing business validation or permissions.
- No unrestricted L5 financial autonomy.

### Audit & Activity

- Record important business mutations.
- Record user identity, timestamps, and transaction references.
- Record configuration changes and AI-generated actions.
- Provide activity/audit history.
- Preserve financial history through adjustments and reversals rather than destructive mutation.

## Scope

### In Scope

- Multi-tenant small-business architecture (modular monolith).
- User authentication and business/workspace management.
- Customers, suppliers, products/services.
- Quotations, sales invoices, purchases, expenses, payments.
- Receivables and payables; basic inventory; double-entry accounting.
- GST-ready transactions and reporting (not filing).
- Dashboard, reports, search, documents, in-app notifications.
- AI copilot with typed tools; confirmation-gated actions.
- **Post-MVP:** Business Intelligence Spine, Operator / Daily Brief, Copilot depth, Automation Engine, selective coverage completers, Guardian, AI Operations — per [`product-roadmap.md`](product-roadmap.md).
- Authorization, audit trail, observability.
- PostgreSQL-backed transactional persistence; API + responsive web.
- Automated testing for critical workflows; production foundations (logging, monitoring, security, backups).

### Out of Scope (active product)

- Feature parity with Vyapar or other billing ERPs.
- Full enterprise ERP, advanced MRP/WMS, complex supply-chain planning.
- Advanced CRM / marketing cloud; full HRMS / payroll as a product goal.
- Automated statutory filing across government portals; e-invoice/e-way as MVP requirements (may appear later via [`future-scope.md`](future-scope.md)).
- Full banking core, payment-gateway platform, complex treasury.
- Advanced fixed assets, consolidation, multi-country tax.
- Microservices-first architecture; premature sharding.
- Unrestricted autonomous AI agents (L5); AI database access without tools.
- AI-controlled accounting overrides, permission changes, or high-value money without approval.
- Building a proprietary foundation model or vector database as a goal.
- Replacing professional accountants or tax professionals; legal compliance guarantees.
- POS / offline / hardware race and industry packs unless promoted from future scope with a metric.

### Later (not current backlog)

See [`context/future-scope.md`](future-scope.md): WhatsApp-native distribution, deeper compliance rails, growth/collect, vertical depth, partner platform.

## Success Criteria

### System of record (MVP — achieved)

1. Sign in, create a business, configure profile, access dashboard.
2. Manage customers and suppliers.
3. Create products/services with prices, units, and GST information.
4. Create a quotation and convert it into a sales invoice.
5. Create a sales invoice with products/services, discounts, and applicable GST.
6. Record a customer payment and see invoice and customer outstanding update correctly.
7. Record purchases and supplier payments and see payables update correctly.
8. Record expenses and see them in financial summaries.
9. Inventory-enabled products reflect supported purchase and sales movements.
10. View stock and identify low-stock products.
11. Supported transactions generate correct accounting effects (debit = credit).
12. Posted financial transactions cannot be silently or destructively modified.
13. View basic sales, purchase, expense, profit, receivable, payable, inventory, and GST-oriented reports.
14. GST correctly distinguishes CGST/SGST vs IGST per configuration.
15. Unified search for common business records.
16. Attach and retrieve authorized documents.
17–21. Thin AI: tool-grounded answers; facts vs recommendations; confirmation; audit; no raw DB.
22. Tenant isolation across UI, API, search, reports, and AI.
23. Critical financial operations transactional and idempotent where distributed.
24. Core ops continue when AI/search/notifications degrade.
25. Deployable with logging, error handling, backups, monitoring foundations.
26. Clean path to expand without rewriting the core truth engine.

### Post-MVP product metrics

27. Owner effort for routine tasks (collections, follow-ups) declines versus manual screens.
28. Automation rate for in-policy routine work increases under L0–L4.
29. Attention quality: Daily Brief / Needs attention surfaces the right issues without asking.
30. Decision quality: cash/stock/credit warnings improve outcomes without inventing ledger numbers.
31. Business coverage: an SME can run essential daily ops without leaving the OS.

## Document pointers

- Active sequencing: [`context/product-roadmap.md`](product-roadmap.md)
- After roadmap: [`context/future-scope.md`](future-scope.md)
- Architecture: [`context/architecture-context.md`](architecture-context.md)
- Progress: [`context/progress-tracker.md`](progress-tracker.md)
