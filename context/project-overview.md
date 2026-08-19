# AI Business OS — Project Overview

## Overview

AI Business OS is a simple, AI-native business management application built for small Indian businesses such as retailers, wholesalers, distributors, service businesses, traders, and small manufacturers. It brings the most commonly required business operations into one place — customers, suppliers, products, sales, purchases, expenses, inventory, payments, basic accounting, GST-oriented reporting, and business insights — while using AI to help business owners understand their data, find problems, generate summaries, and perform approved actions. The MVP is intentionally focused on the essential 80% of workflows used by small businesses rather than attempting to reproduce a full enterprise ERP.

## Goals

1. Provide a single application through which a small Indian business can manage its day-to-day sales, purchases, expenses, inventory, customers, suppliers, payments, and basic financial records.
2. Allow a business owner to quickly understand the current state of the business through dashboards, reports, outstanding balances, cash-flow information, sales trends, purchase information, inventory status, and GST-oriented summaries.
3. Provide an AI business assistant that can answer questions about the business, explain financial and operational information, generate useful summaries, identify anomalies or risks, and perform selected business actions through controlled tools.
4. Maintain reliable and auditable business data with appropriate validation, authorization, transaction integrity, and tenant isolation.
5. Keep the architecture simple enough to develop, deploy, operate, and maintain as an MVP while providing a clean path for future expansion into a larger AI Business OS.

## Core User Flow

1. User creates an account and signs in.
2. User creates or selects their business.
3. User completes basic business setup including business name, contact details, address, GSTIN, financial year, and tax configuration.
4. User creates or imports customers and suppliers.
5. User creates products and services with units, prices, tax rates, and optional inventory tracking.
6. User records business transactions such as quotations, sales invoices, purchases, expenses, and payments.
7. The system validates the transaction and updates the relevant customer/supplier balances, inventory, tax information, and financial records.
8. User opens the dashboard to view sales, purchases, expenses, receivables, payables, inventory, and other key business metrics.
9. User opens reports to understand business performance and GST-related information.
10. User can search the business using natural language through the AI assistant.
11. The AI assistant retrieves authorized business information, explains results, summarizes activity, identifies useful insights, and recommends actions.
12. When an AI action is supported, the AI requests or executes the action through an authorized business tool according to the application's approval and permission rules.
13. All important business mutations and AI-initiated actions are recorded in the audit history.

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

- Maintain a chart of accounts appropriate for the MVP.
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

### Dashboard & Reporting

- Business overview dashboard.
- Sales summary.
- Purchase summary.
- Expense summary.
- Receivables summary.
- Payables summary.
- Cash/payment summary.
- Inventory summary.
- Profit/income summary.
- GST-oriented summary.
- Date-based filtering.
- Basic charts and business KPIs.
- Exportable reports where practical.

### Search

- Search customers.
- Search suppliers.
- Search products.
- Search invoices and purchases.
- Search payments and expenses.
- Filter by date, status, amount, customer, supplier, category, and other relevant fields.
- Provide a unified global search experience for common business records.

### Documents

- Upload documents and attachments.
- Attach documents to supported business records.
- Store documents securely.
- View and download authorized documents.
- Maintain document metadata.
- Support invoice/receipt attachments and expense evidence.

### Notifications

- In-app notifications.
- Important transaction notifications.
- Outstanding-payment reminders.
- Low-stock notifications.
- Basic system notifications.
- Architecture should allow future email, SMS, and WhatsApp integrations.

### AI Business Assistant

- Ask questions about business data using natural language.
- Answer questions about sales, purchases, expenses, customers, suppliers, inventory, payments, and outstanding balances.
- Summarize business performance.
- Explain financial and operational reports.
- Identify unusual or potentially important business activity.
- Answer questions such as:
  - "How much did I sell this month?"
  - "Who owes me the most money?"
  - "Which products are running low?"
  - "What were my biggest expenses?"
  - "How much GST did I collect?"
  - "Which customers have overdue payments?"
- Generate payment-reminder drafts.
- Generate business summaries and reports.
- Provide contextual explanations of business metrics.
- Use authorized tools rather than unrestricted database access.

### AI Business Actions

- Allow AI to perform a limited set of approved actions.
- Require authorization before every business mutation.
- Require human confirmation for high-risk actions.
- Maintain an audit trail of AI actions.
- Support idempotent execution.
- Prevent AI from bypassing business validation or permissions.

### Audit & Activity

- Record important business mutations.
- Record user identity for important actions.
- Record timestamps and relevant transaction references.
- Record important configuration changes.
- Record AI-generated actions.
- Provide a basic activity/audit history.
- Preserve financial transaction history through adjustments and reversals rather than destructive mutation.

## Scope

### In Scope

- Multi-tenant small-business architecture.
- User authentication and business/workspace management.
- Customers and suppliers.
- Products and services.
- Quotations.
- Sales invoices.
- Purchase transactions.
- Expenses.
- Customer and supplier payments.
- Receivables and payables.
- Basic inventory management.
- Basic double-entry accounting.
- Basic financial reporting.
- GST-oriented transaction and reporting support.
- HSN/SAC and GSTIN management.
- Dashboard and business reports.
- Global search and filtering.
- Document attachments.
- Basic notifications.
- AI business assistant.
- Limited AI-powered business actions.
- Authorization and audit trail.
- PostgreSQL-backed transactional persistence.
- Modular monolith architecture.
- API-based backend.
- Responsive web application.
- Automated testing for critical business workflows.
- Production-ready foundations for logging, monitoring, security, and backups.

### Out of Scope

- Full enterprise ERP functionality.
- Advanced manufacturing/MRP.
- Advanced warehouse management.
- Complex multi-level supply-chain planning.
- Advanced CRM and marketing automation.
- Full HRMS.
- Advanced attendance and leave management.
- Full-featured payroll engine with every Indian statutory edge case.
- Automated statutory filing across every government portal.
- Direct integration with every GST/e-invoicing/e-way-bill government service in V1.
- Full banking core or banking platform.
- Full payment gateway platform.
- Complex treasury management.
- Advanced fixed-asset management.
- Advanced consolidation and multi-company accounting.
- Complex international taxation.
- Full multi-country accounting.
- Microservices architecture in the initial MVP.
- Unrestricted autonomous AI agents.
- AI access to the database without controlled business tools.
- AI-controlled accounting overrides.
- AI-controlled authorization or permission changes.
- Autonomous high-value financial transactions without human approval.
- Building a proprietary foundation model.
- Building a proprietary vector database.
- Replacing professional accountants or tax professionals.
- Automatic filing or legal compliance guarantees.

## Success Criteria

1. A user can sign in, create a business, configure basic business information, and access the business dashboard.
2. A user can create, edit, search, and manage customers and suppliers.
3. A user can create products/services with prices, units, and GST information.
4. A user can create a quotation and convert it into a sales invoice.
5. A user can create a sales invoice with products/services, discounts, and applicable GST.
6. A user can record a customer payment and see the invoice and customer outstanding balance updated correctly.
7. A user can record purchases and supplier payments and see supplier payables updated correctly.
8. A user can record expenses and see them reflected in relevant financial summaries.
9. Inventory-enabled products automatically reflect supported purchase and sales movements.
10. A user can view current stock and identify low-stock products.
11. Supported business transactions generate correct accounting effects and maintain the debit/credit invariant.
12. Posted financial transactions cannot be silently or destructively modified.
13. A user can view basic sales, purchase, expense, profit, receivable, payable, inventory, and GST-oriented reports.
14. GST calculations correctly distinguish applicable CGST/SGST and IGST scenarios according to the configured transaction information.
15. A user can search common business records through a unified search experience.
16. A user can attach and retrieve authorized documents from supported business records.
17. The AI assistant can answer common business questions using authorized, current business data.
18. AI responses clearly distinguish business facts from recommendations or predictions.
19. AI cannot directly access unrestricted database operations and must use approved business tools.
20. High-risk AI actions require appropriate user confirmation or approval.
21. Every important AI-initiated mutation is auditable.
22. Tenant A cannot access or modify Tenant B's data through the UI, API, search, reports, or AI assistant.
23. Critical financial operations are transactional and idempotent where distributed processing is involved.
24. Core business operations continue to function when non-critical AI, search, analytics, or notification components are unavailable.
25. The MVP can be deployed reproducibly and has sufficient logging, error handling, backups, and monitoring to operate as a real small-business application.
26. The application provides a clean architectural path for future expansion into advanced workflows, integrations, analytics, copilots, and autonomous business agents without requiring a rewrite of the core business system.

