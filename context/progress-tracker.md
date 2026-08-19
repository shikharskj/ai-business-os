# AI Business OS — Progress Tracker

Update this file after **every meaningful implementation change**.

This file is the **single source of truth for implementation progress**. The AI developer must read it before starting work and update it after completing each meaningful unit.

---

## Current Phase

* **Phase:** MVP Development
* **Status:** In Progress
* **MVP Stage:** Foundation / Design System

---

## Current Goal

Build and ship a **production-ready MVP of the AI Business OS for small Indian businesses**.

The MVP should provide the most frequently required business operations in one simple application:

```text
Authentication
      ↓
Business Setup
      ↓
Dashboard
      ↓
Customers
      ↓
Products / Inventory
      ↓
Sales / Invoices
      ↓
Payments
      ↓
Expenses
      ↓
Purchases / Suppliers
      ↓
Basic Accounting
      ↓
GST-ready Business Data
      ↓
Reports
      ↓
AI Business Assistant
```

The priority is **correctness, usability, and a complete end-to-end business workflow**, not maximum feature breadth.

---

# MVP Development Priorities

Features should generally be implemented in this order:

1. Project foundation
2. Authentication
3. Business/workspace setup
4. Database and tenant isolation
5. Customers
6. Products
7. Inventory
8. Sales invoices
9. Payments
10. Expenses
11. Suppliers
12. Purchases
13. Basic accounting
14. GST-ready calculations/data
15. Dashboard
16. Reports
17. AI assistant
18. Notifications
19. Production hardening

Do not skip foundational dependencies merely to build visually impressive features.

---

# Current Goal Status

| Area                  | Status      |
| --------------------- | ----------- |
| Project setup         | In Progress |
| Design system         | Complete    |
| Authentication        | Not Started |
| Business setup        | Not Started |
| Multi-tenancy         | Not Started |
| Database              | Not Started |
| Customers             | Not Started |
| Products              | Not Started |
| Inventory             | Not Started |
| Sales                 | Not Started |
| Invoices              | Not Started |
| Payments              | Not Started |
| Expenses              | Not Started |
| Suppliers             | Not Started |
| Purchases             | Not Started |
| Accounting            | Not Started |
| GST                   | Not Started |
| Dashboard             | Not Started |
| Reports               | Not Started |
| AI Assistant          | Not Started |
| Notifications         | Not Started |
| Testing               | Not Started |
| Security hardening    | Not Started |
| Production deployment | Not Started |

---

# Completed

* Design system and UI primitives (`01-design-system.md`):
  * Installed and configured shadcn/ui (Base UI, `base-nova` style).
  * Installed `lucide-react`.
  * Added `lib/utils.ts` with reusable `cn()` helper.
  * Added shadcn primitives: Button, Card, Dialog, Input, Tabs, Textarea, Scroll Area, Tooltip, Toast, Skeleton, Spinner, Table, Select, Dropdown Menu, Sidebar, Progress, Attachment, Avatar, Badge, Breadcrumb, Calendar, Checkbox, Chart, Context Menu, Navigation Menu, Resizable, Separator.
  * Added composed patterns: Data Table (`components/data-table/`), Date Picker (`components/date-picker.tsx`).
  * Mapped AI Business OS design tokens in `app/globals.css` for shadcn semantic variables.
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

* None yet.

---

# Next Up

## 1. Project Foundation

Build the initial application foundation:

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

## 2. Authentication — Clerk

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
* Do not use Clerk Organization/Workspace functionality as a substitute for the application's business ownership model unless explicitly approved by `Architecture.md`.
* If Clerk Organizations are later used for multi-user business access, the mapping between Clerk Organizations and application Businesses must be explicitly documented.

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

A new user can create or configure their business and access its dashboard.

---

## 4. Tenant Isolation

Implement the foundational ownership model.

Every business record must belong to a business/workspace.

Example:

```text
Clerk User
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

The Clerk identity is the authenticated identity source.

The application's Business entity remains the authoritative owner of business data.

### Completion Criteria

A user cannot access another business's records even by manually modifying IDs in requests.

Tenant resolution must happen from trusted authenticated context and application ownership relationships.

---

# Feature Progress

## Customers

* Customer database model
* Create customer
* Edit customer
* View customer
* Customer list
* Search customers
* Customer detail
* Customer transaction history
* Outstanding balance

---

## Products

* Product database model
* Create product
* Edit product
* Product list
* Product details
* SKU
* HSN/SAC
* Selling price
* Purchase price
* Tax configuration
* Unit of measurement

---

## Inventory

* Opening stock
* Stock-in
* Stock-out
* Inventory adjustment
* Current stock
* Low-stock detection
* Inventory movement history

---

## Sales

* Sales workflow
* Invoice creation
* Invoice numbering
* Customer selection
* Product selection
* Quantity
* Discount
* Tax calculation
* Invoice total
* Invoice status

---

## Payments

* Record payment
* Payment against invoice
* Partial payment
* Full payment
* Outstanding balance
* Payment history
* Payment status

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

* Supplier model
* Create supplier
* Edit supplier
* Supplier list
* Supplier detail
* Outstanding payable

---

## Purchases

* Purchase record
* Supplier selection
* Product selection
* Quantity
* Purchase price
* Tax
* Purchase total
* Inventory update
* Supplier payable

---

# Accounting

The MVP accounting system should remain intentionally simple while maintaining financial correctness.

* Chart of Accounts foundation
* Journal entry model
* Debit/credit representation
* Automatic posting from invoices
* Automatic posting from payments
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

Do not introduce multiple communication providers until the core notification abstraction is stable.

---

# Testing Progress

## Unit Tests

* Tax calculations
* GST calculations
* Invoice totals
* Discount calculations
* Payment allocation
* Inventory calculations
* Accounting posting
* Permission rules

## Integration Tests

* Database repositories
* Transactions
* Invoice workflow
* Payment workflow
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

* Clerk authentication
* Authorization
* Tenant isolation
* Input validation
* API protection
* Rate limiting where required
* Secure file handling
* Secret management
* Audit logging
* Dependency security checks
* AI prompt-injection protections
* AI tool authorization
* Clerk configuration security
* Server-side authentication checks

---

# Production Readiness

Before MVP release:

* Production database configured
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

* Which PostgreSQL hosting provider should be used?
* Which object storage provider should be used?
* Which AI provider/model should power the initial assistant?
* Should the MVP support multiple users per business immediately or begin with owner-only access?
* Which payment methods should be supported initially?
* How much GST functionality belongs in the MVP versus a later release?
* Which Indian accounting conventions should be implemented in the first release?
* Should Clerk Organizations be used for multi-user business/workspace membership, or should the MVP use an application-level Business membership model backed by Clerk user identity?

Do not silently resolve these decisions if they materially affect architecture.

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

### 2026-08-19 — Design System and UI Primitives

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
### YYYY-MM-DD — [Feature / Unit]

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
