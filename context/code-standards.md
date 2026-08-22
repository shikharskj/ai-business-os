# AI Business OS — Code Standards

## General

* Keep modules small, cohesive, and single-purpose.
* Prefer simple, explicit code over clever abstractions.
* Fix root causes instead of layering workarounds.
* Do not mix unrelated concerns in the same component, route, service, or module.
* Keep business rules close to the domain that owns them.
* Keep infrastructure concerns separate from domain logic.
* Prefer composition over inheritance.
* Prefer existing project abstractions over creating duplicate abstractions.
* Do not introduce a new pattern unless existing patterns cannot reasonably solve the problem.
* Avoid premature abstraction.
* Extract shared code only when there is a real reuse boundary.
* Do not introduce infrastructure solely for hypothetical future requirements.
* Favor readable code over overly compressed code.
* Names must communicate intent.
* Avoid abbreviations unless universally understood within the domain.
* Keep functions focused on one responsibility.
* Keep side effects explicit.
* Do not hide important business behavior inside generic utility functions.
* Comments should explain **why**, not simply repeat **what** the code does.
* Remove dead code instead of leaving commented-out implementations.
* Do not silently swallow errors.
* Never use `console.log` as the production logging mechanism.
* Never commit secrets, credentials, tokens, private keys, or sensitive production configuration.

---

# TypeScript

* TypeScript strict mode is required throughout the project.
* Avoid `any`.
* Prefer explicit types, interfaces, discriminated unions, and generics.
* Use `unknown` when external data is genuinely unknown.
* Narrow `unknown` through runtime validation before using it.
* Never use unchecked type assertions merely to silence TypeScript.
* Avoid `as any`.
* Avoid non-null assertions (`!`) unless the invariant is genuinely guaranteed and documented.
* Prefer discriminated unions for state machines and mutually exclusive states.
* Prefer literal types and constants where they improve domain clarity.
* Keep domain types separate from database-generated types where appropriate.
* Do not expose Prisma/database types directly throughout the UI.
* Use explicit DTOs at application/API boundaries.
* Infer types from Zod schemas where practical.
* Use branded/value-object types where confusing primitive values could cause financial or domain errors.
* Monetary values must use safe decimal representations.
* Never use JavaScript floating-point numbers for authoritative financial calculations.
* Avoid generic `string` types where a meaningful domain type provides stronger protection.
* Respect the application's UTC/timezone rules.
* Avoid mutable global state.

---

# Runtime Validation

* TypeScript types do not validate runtime input.
* Validate all untrusted external input.
* Use Zod for:

  * Request bodies.
  * Query parameters.
  * Forms.
  * Environment configuration.
  * Webhook payloads.
  * AI tool inputs.
  * Imported business data.
  * External API responses.
* Validate at system boundaries before passing data into business logic.
* Never assume client-side validation is sufficient.
* Never trust client-supplied:

  * `tenantId`
  * `userId`
  * `role`
  * `permission`
  * ownership identifiers.
* Validate uploaded file metadata before processing.
* Treat AI-generated structured output as untrusted until validated.

---

# React / Next.js

* Default to Server Components.
* Use `"use client"` only when browser-side interactivity, state, effects, or browser APIs require it.
* Keep Client Components as small as practical.
* Do not move entire pages to the client merely because one child requires interactivity.
* Keep server-side business logic out of Client Components.
* Never expose secrets or privileged server functionality to Client Components.
* Keep Route Handlers focused on HTTP concerns.
* Route Handlers must delegate business behavior to application use cases/services.
* Server Actions must delegate business behavior rather than containing large workflows.
* Never put Prisma calls directly inside React components.
* Avoid unnecessary client-side data fetching.
* Use appropriate loading and error boundaries.
* Prefer URL state for shareable/filterable navigation state where appropriate.
* Browser state must never become the source of truth for business records.
* Server state is authoritative for business data.

### Component Responsibility

Preferred:

```text
Page
 ↓
Feature Component
 ↓
Reusable UI Component
```

Avoid:

```text
Page
 ↓
500-line component containing
UI + database + business rules + AI + mutations
```

---

# Application Architecture

Follow the architecture defined in `Architecture.md`.

Preferred dependency flow:

```text
UI
 ↓
Application Use Case
 ↓
Domain
 ↓
Repository / Infrastructure
 ↓
Database
```

For AI:

```text
AI
 ↓
Authorized Tool
 ↓
Application Use Case
 ↓
Domain
 ↓
Repository
 ↓
Database
```

Never bypass application/domain boundaries merely because direct database access is shorter.

---

# Domain Logic

* Domain logic must be framework-independent wherever practical.
* Business rules must not live exclusively inside UI components.
* Business rules must not depend directly on Prisma.
* Business rules must not depend directly on React.
* Business rules must not depend directly on an AI provider.
* Business rules must be deterministic where possible.
* Domain calculations must be independently testable.
* Use domain-specific names.
* Avoid generic names such as `processData()`.
* Prefer explicit state transitions over arbitrary status mutation.
* Validate legal state transitions.
* Keep financial rules explicit and deterministic.

Preferred:

```text
CreateInvoiceUseCase
    ↓
InvoiceDomain
    ↓
TaxCalculator
    ↓
AccountingPosting
```

Avoid:

```text
InvoicePage
    ↓
calculateEverythingAndSave()
```

---

# Authentication — Clerk

**Clerk is the only authentication provider for the application.**

Do not introduce or use:

* Auth.js.
* NextAuth.
* Better Auth.
* Custom JWT authentication.
* Custom session management.
* Custom password authentication.
* A second authentication provider.
* Homemade authentication middleware.

Clerk owns authentication and identity.

### Authentication Responsibilities

Clerk is responsible for:

* Sign-up.
* Sign-in.
* Sign-out.
* Session management.
* User identity.
* Authentication state.
* Authentication middleware.
* OAuth/social authentication where configured.
* Email/password authentication where configured.
* MFA/security features where enabled.

The application is responsible for:

* Tenant/workspace membership.
* Application roles.
* Application permissions.
* Business authorization.
* Resource-level authorization.
* Business ownership.
* Financial permissions.

### Server-Side Authentication

Protected server operations must resolve the authenticated Clerk user through the official Clerk server-side APIs.

Never trust:

```text
userId
tenantId
role
permission
```

from the request body, query parameters, URL, or client state.

Preferred flow:

```text
Request
 ↓
Clerk Authentication
 ↓
Authenticated Clerk User
 ↓
Application User Mapping
 ↓
Tenant Membership
 ↓
Authorization
 ↓
Application Use Case
```

### Clerk Identity

The Clerk user ID is the external identity identifier.

Application business data must not assume that Clerk contains all business-specific user information.

Use an application user/membership model for:

```text
User
Membership
Tenant
Role
Permissions
Business Profile
```

Clerk identity and application identity must remain clearly separated.

### Clerk User Mapping

Where required, maintain an application mapping such as:

```text
Clerk User
    ↓
Application User
    ↓
Tenant Membership
    ↓
Role / Permissions
```

Do not duplicate authentication state unnecessarily.

### Client Authentication

Client Components may use Clerk's official client-side hooks/components when authentication state is required.

Do not implement custom:

```text
isLoggedIn
currentUser
session
token
```

state when Clerk already provides the authoritative authentication state.

### Middleware

Use Clerk's official Next.js integration for route protection.

Authentication middleware should establish authentication boundaries.

Business authorization must still occur inside the server-side application layer.

Never treat middleware alone as sufficient authorization.

### Webhooks

If Clerk webhooks are used to synchronize application users or organizations:

* Validate webhook signatures.
* Validate webhook payloads.
* Make webhook processing idempotent.
* Do not blindly trust webhook payload structure.
* Do not expose webhook secrets.
* Record relevant synchronization failures.
* Do not allow webhook processing to bypass application invariants.

---

# Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
What is this user allowed to do?
```

* Clerk handles authentication.
* Application RBAC/policy logic handles authorization.
* Authorization must be enforced server-side.
* Frontend permission checks are UX only.
* Never trust client-provided roles or permissions.
* Every privileged mutation must perform authorization.
* AI tools must use the same authorization model as normal application operations.

Preferred:

```text
Clerk
 ↓
Authenticated User
 ↓
Tenant Membership
 ↓
Permission Check
 ↓
Use Case
```

---

# Multi-Tenant Code

Every tenant-scoped operation must resolve tenant context from trusted authenticated context.

Prefer:

```text
repository.findInvoice({
  tenantId,
  invoiceId
})
```

over:

```text
repository.findInvoice(invoiceId)
```

Never:

```text
find invoice
then check tenant
```

if the query itself can enforce tenant isolation.

Every tenant-scoped database query must enforce tenant isolation.

---

# Financial Code

Financial code requires stricter standards than ordinary application code.

* Never use floating-point arithmetic for authoritative monetary calculations.
* Use `Decimal`/`NUMERIC` or an equivalent safe money representation.
* Define rounding rules explicitly.
* Define currency explicitly.
* Never silently round financial values.
* Keep taxable amount and tax amount calculations deterministic.
* Validate invoice totals before posting.
* Validate payment allocation before recording payment.
* Validate accounting balance before posting journals.
* Never directly modify posted journal lines.
* Use reversals or adjustment entries for corrections.
* Financial mutations must execute inside appropriate database transactions.
* Every financial mutation must remain auditable.
* Test positive, zero, negative-invalid, minimum, maximum, and rounding scenarios.

Example:

```text
Invoice
 ├── Subtotal
 ├── Discount
 ├── Taxable Amount
 ├── CGST
 ├── SGST
 ├── IGST
 └── Grand Total
```

There must be one authoritative implementation of invoice calculations.

Do not independently calculate invoices in:

```text
UI
API
PDF generator
AI
Reports
```

The invoice PDF and on-screen tax invoice preview share `InvoiceDocumentView`. Totals on that view come from `previewInvoice` / stored invoice amounts (tax engine), never from React or ad-hoc PDF arithmetic.

---

# GST / Tax Code

* GST calculations must be deterministic.
* Tax logic must be isolated from UI rendering.
* Do not embed GST formulas inside React components.
* HSN/SAC must be represented explicitly.
* CGST, SGST, and IGST must be represented separately.
* Tax rates must be explicit.
* Tax calculations must be independently tested.
* LLMs must never become authoritative tax calculators.
* AI may explain application-generated tax results.
* Tax configuration changes must be auditable where appropriate.
* Avoid scattering tax rules throughout the codebase.
* Keep tax rules centralized and testable.

---

# Accounting Code

* Accounting posting logic belongs in the accounting/domain layer.
* Every posted journal must balance.
* Journal entries must use explicit debit/credit semantics.
* Do not allow arbitrary callers to create unbalanced journals.
* Business transactions must generate accounting effects through explicit posting rules.
* Accounting posting must be transactional with the originating mutation when atomicity is required.
* Posted journals are immutable.
* Corrections use reversal/adjustment entries.
* Accounting period restrictions must be enforced server-side.
* Ledger/report calculations must consume authoritative accounting records.

---

# Inventory Code

* Inventory is movement-based.
* Do not directly mutate stock balances from arbitrary code.
* Use explicit operations such as:

  * Purchase receipt.
  * Sale issue.
  * Return.
  * Adjustment.
* Inventory operations must be traceable to their source transaction.
* Stock calculations must be deterministic.
* Inventory updates must participate in the originating transaction when atomicity is required.
* Prevent duplicate inventory movements through idempotency.
* Test stock-in, stock-out, returns, and adjustments independently.

---

# API Routes

Every protected mutation must:

1. Authenticate through Clerk.
2. Resolve the authenticated application user.
3. Resolve tenant context.
4. Authorize the requested operation.
5. Validate input.
6. Execute the appropriate application use case.
7. Return a structured response.
8. Produce appropriate logs/audit/events.

Route handlers must remain thin.

Preferred:

```text
Route Handler
 ↓
Clerk Authentication
 ↓
Tenant Resolution
 ↓
Authorization
 ↓
Validation
 ↓
Use Case
 ↓
Response
```

Avoid:

```text
Route Handler
 ↓
Validation
 ↓
300 lines of business logic
 ↓
Prisma
 ↓
Email
 ↓
AI
 ↓
More logic
```

---

# Server Actions

* Server Actions must follow the same authentication and authorization rules as API routes.
* Validate every argument.
* Resolve Clerk identity server-side.
* Resolve tenant context server-side.
* Keep actions thin.
* Delegate to application services/use cases.
* Never use Server Actions as a bypass around authorization.
* Do not expose privileged operations merely because they originate from a Server Component.

---

# Data and Storage

* PostgreSQL is the source of truth for transactional business data.
* Metadata, relationships, ownership, statuses, and structured business records belong in PostgreSQL.
* Large binary files belong in object storage.
* Do not store large files directly in PostgreSQL unless deliberately justified.
* Store object-storage metadata in PostgreSQL.
* Never expose storage credentials to clients.
* Use signed/authorized URLs for protected files where appropriate.
* Uploaded files must be validated and treated as untrusted.
* Database queries must always respect tenant boundaries.
* Use transactions for operations requiring atomicity.
* Use foreign keys and unique constraints for critical integrity rules.
* Add indexes based on real query patterns.
* Avoid N+1 queries.

---

# Prisma / Database Access

* Prisma access belongs in infrastructure/persistence layers.
* Never import Prisma directly into UI components.
* Do not scatter Prisma calls throughout application services when repositories provide a clearer boundary.
* Keep complex queries close to the domain/read model that owns them.
* Use explicit transactions for multi-step atomic mutations.
* Do not perform database mutations from read-only query functions.
* Avoid loading unnecessary fields or relationships.
* Avoid unbounded queries.
* Paginate large datasets.
* Use database constraints to protect important invariants.
* Use migrations for schema changes.
* Never modify an already-applied migration.
* Migration names must clearly communicate their purpose.

---

# Repository Pattern

Repositories abstract persistence, not business rules.

Good:

```text
InvoiceRepository
    ↓
Find Invoice
Save Invoice
Find Outstanding Invoices
```

Avoid:

```text
InvoiceRepository
    ↓
Calculate GST
Post Journal
Send Email
Call AI
```

Repositories primarily handle persistence concerns.

Business orchestration belongs in application/domain layers.

---

# Queries and Read Models

* Separate state-changing commands from read queries where practical.
* Queries must not unexpectedly mutate state.
* Optimize reporting queries independently from transactional commands.
* Use dedicated read models when complexity or performance justifies them — especially **AttentionQueue / Daily Brief / BusinessState** (yes); avoid inventing read models for one-off screens (no).
* Derived reporting/search/projection data must never become the transactional source of truth.
* Always apply tenant and authorization filters to read models.
* Paginate large datasets; index list/projection queries by `(tenantId, …)`.
* Avoid loading entire tables into memory.
* Ban N+1 queries on list and detail hot paths.

---

# API Response Standards

Successful responses should communicate:

```text
data
metadata where required
```

Errors should communicate:

```text
code
message
fieldErrors where applicable
requestId where useful
```

Do not expose internal implementation details.

Avoid inconsistent response structures without a documented reason.

---

# Error Handling

* Use typed/domain-specific errors where practical.
* Distinguish:

  * Validation.
  * Authentication.
  * Authorization.
  * Not found.
  * Conflict.
  * Business rule.
  * Infrastructure.
  * Unexpected errors.
* Map domain errors to safe API responses.
* Log unexpected errors with sufficient diagnostic context.
* Never silently ignore failures.
* Never use empty `catch` blocks.
* Do not return `500` for predictable user errors.
* Do not expose internal exception messages.
* Preserve correlation IDs across async boundaries.

---

# Async / Background Jobs

* Background jobs belong in the worker/job layer.
* Jobs must be idempotent where duplicate execution is possible.
* Jobs should have bounded retries.
* Use exponential backoff for transient failures.
* Record job status.
* Record failure information safely.
* Do not retry permanent failures indefinitely.
* Financial mutations require idempotency protection.
* Keep job payloads small.
* Store references/IDs rather than duplicating large business objects.
* Never put secrets into queue payloads.

---

# Events

* Events represent facts that have occurred.
* Use explicit event names and include `tenantId`, correlation ids, and a schema version when payloads evolve.
* Emit outbox events in the **same database transaction** as the domain mutation.
* Keep payloads small (ids + essentials); do not expose unnecessary database implementation details.
* Event consumers must tolerate duplicate delivery and be independently testable.
* Do not assume exactly-once delivery.
* Use the Outbox Pattern where reliable publication is required.
* Fan-out may include search, notifications, BusinessState projections, and automation.

# Projections / BusinessState

* Projections are derived read models; they must be rebuildable from source truth.
* Upsert by natural key including `tenantId`.
* Index projection queries by `(tenantId, …)`.
* Never write ledger money, tax, or stock balances from projection code — only aggregate domain truth.
* Provide a rebuild/backfill command for each projection family.
* Use projections for attention, Daily Brief, and AI context assembly — not for inventing new “screens of reports.”

# Automation

* Automation/workflows belong behind a clear module boundary (`modules/workflows` and/or automation consumers).
* Pattern: event → condition → reasoning → action → result → outcome.
* Every mutating action calls existing domain use cases with the same authz as the UI.
* Require idempotency keys for sends and posts.
* Record outcomes for learning hooks.
* First vertical: collections (unless progress-tracker says otherwise).

# Autonomy metadata

* Tools and automatable actions declare autonomy level L0–L4.
* L3 uses the existing confirm-token path.
* L4 requires explicit tenant policy + thresholds.
* L5 is forbidden.

---

# AI Code Standards

AI code must follow stricter boundaries than ordinary application code.

## AI Provider

Provider-specific code belongs behind the AI Gateway.

Avoid:

```text
InvoiceService
 ↓
AI Provider SDK
```

Prefer:

```text
Assistant chat route
 ↓
AI SDK streamText (@ai-sdk/google)
 ↓
modules/ai tools (authz / Zod / audit)
```

Do not allow individual business modules to become coupled to a specific AI provider. Do not keep parallel hand-rolled `complete()` adapters.

## Gateway Usage

* Stream chat through `POST /api/assistant/chat` using the Vercel AI SDK (`streamText` + `useChat`). Do not add hand-rolled `complete()` provider adapters.
* Resolve Gemini via `resolveAiConfig` / `getAssistantLanguageModel()` (`AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`). Development without a key uses a deterministic stub stream; production refuses the stub and a missing key.
* Multi-provider later means another `@ai-sdk/*` package on the chat route — not a resurrected fetch adapter under `lib/ai`.
* Never import `ai` or `@ai-sdk/*` from `modules/ai/domain`, tool implementations, or schemas. SDK types stay in the route, `lib/ai/model.ts`, `lib/ai/assistant-sdk-tools.ts`, and client hooks.
* Misconfiguration surfaces as `AiConfigError`; provider failures as `AiProviderError` (or SDK errors mapped by `describeAssistantFailure`). Business pages must keep working when either is thrown (invariant 33).
* Assemble model context from trusted identity → BusinessState/attention summaries (when present) → typed tool facts → sanitized conversation text. Do not dump raw multi-table query results into prompts.

## Tool Definition

* Define tools with `defineAiTool` and register them in `modules/ai/application/tools/registry.ts`. A tool that is not in the registry does not exist.
* Declare `permission` and `category` on the tool; `executeAiTool` enforces them. Do not re-check authorization inside the tool body.
* Advertise tools with `listAiToolsForRole(role)` / `listAiToolSpecsForRole(role)` so the model only sees tools the caller may run.
* Tool input schemas must not contain `tenantId`, `userId`, `role`, or `permission`; `assertNoIdentityOverride` rejects such input.
* SDK tool `execute` handlers call `runAiToolCall` (or emit a signed pending action for confirmation-required tools). Tool results returned to the model should be treated as untrusted data.
* Build the execution context on the server with `createAiToolContext()` from `modules/ai/infrastructure/tool-context`. It is imported by its own path rather than the `modules/ai` barrel, because client components import that barrel. `modules/ai/domain/action-token` is kept out of the barrel for the same reason — it uses `node:crypto`.

## Assistant Transport

* The chat route is the only place that drives model streaming and tool calling for the assistant; cap steps rather than looping until the model stops.
* Never query the database from a chat route or component. A route that needs business data needs a tool.
* Show a business number only if it came from `factsFromToolResult` (emitted as typed stream data parts). Model text is never treated as verified figures.
* Say what could not be done. A tool a role cannot run, a lookup that failed, or a question no tool can answer becomes a user-facing notice — not a silent gap or a guess.

## Action Confirmation

* Give a mutation tool `category: "action"`, `requiresConfirmation: true`, and a preview in `previewAiAction`. The chat path refuses to execute an action it cannot preview.
* A chat turn never executes a mutation. It returns a preview; execution needs a separate confirmed request.
* Confirmation supplies consent only. `executeAiTool` still re-checks identity, permission, and input schema, and still audits. Never add a path that treats a confirmation as pre-authorized.
* Bind a confirmation to what was previewed with `signAiActionToken` / `verifyAiActionToken`, and check the payload's tenant and user against the current session.
* An action tool must reuse an existing application use case and re-derive its own facts. The model may name records; it must never supply amounts, customer details, or generated content that lands in a business record.

---

# AI Tools

Every AI tool must have:

* Explicit name.
* Explicit description.
* Typed input schema.
* Typed output schema.
* Authentication context.
* Tenant context.
* Authorization check.
* Input validation.
* Error handling.
* Audit behavior for mutations.
* Idempotency behavior where applicable.

Good:

```text
getOutstandingReceivables
recordCustomerPayment
createPaymentReminder
```

Bad:

```text
executeAnything
runDatabaseQuery
modifyRecord
```

AI tools must call application use cases rather than directly manipulating persistence.

---

# AI Output

* Never trust raw LLM output.
* Validate structured model output.
* Use schemas for machine-consumed responses.
* Keep financial values grounded in authoritative application data.
* Clearly separate facts from recommendations.
* Never let model output directly mutate financial state.
* Never execute arbitrary code generated by an LLM.
* Never allow AI-generated SQL to execute against production.
* AI-generated text must be treated as untrusted content before rendering.

---

# AI Prompt Standards

Prompts should be:

* Versioned where important.
* Explicit about the assistant's role.
* Explicit about available tools.
* Explicit about prohibited actions.
* Explicit about data boundaries.
* Explicit about uncertainty.
* Explicit about confirmation requirements.

Prompts must never be considered a security boundary.

Authorization and safety controls must exist in application code.

---

# AI Context

* Provide only context necessary for the task.
* Prefer structured business data over copied prose.
* Retrieve authoritative information through application tools.
* Never expose unrelated tenant data.
* Never expose data the user cannot access.
* Treat retrieved documents as untrusted content.
* Retrieved content must never override system policies, authorization, or application rules.

---

# AI Action Safety

Before every AI mutation:

```text
Validate
 ↓
Authenticate
 ↓
Authorize
 ↓
Policy Check
 ↓
Confirm if Required
 ↓
Execute
 ↓
Audit
```

Never:

```text
LLM Output
 ↓
Direct Database Mutation
```

---

# Security

* Authentication is handled by Clerk.
* Authorization is handled by the application policy/RBAC layer.
* Tenant isolation is enforced server-side.
* Validate all external input.
* Sanitize user-generated content where necessary.
* Protect against injection attacks.
* Use Clerk's secure authentication/session mechanisms.
* Do not implement custom authentication/session infrastructure.
* Use CSRF protection where applicable.
* Apply rate limiting to sensitive/high-volume endpoints.
* Protect file uploads.
* Do not expose secrets to clients.
* Do not log secrets.
* Keep dependencies updated.
* Run dependency/security checks in CI.
* Use least-privilege access for external services.

---

# Authentication and Authorization Code

Authentication:

```text
Clerk
```

Authorization:

```text
Application RBAC + Policy Layer
```

Never combine them into an implicit single check.

Preferred:

```text
Clerk
 ↓
Authenticated User
 ↓
Application User
 ↓
Tenant Membership
 ↓
Permission Check
 ↓
Use Case
```

The following are prohibited:

```text
Auth.js
NextAuth
Better Auth
Custom JWT
Custom session cookies
Custom password hashing/authentication
Client-provided role checks
Client-provided tenant authorization
```

---

# Clerk Integration Rules

* Use the official Clerk Next.js integration.
* Keep Clerk integration isolated within the authentication infrastructure.
* Prefer official Clerk APIs/components over custom wrappers unless a wrapper provides meaningful application value.
* Do not duplicate Clerk session state in Zustand.
* Do not store Clerk session tokens in localStorage.
* Do not expose Clerk secret keys to the browser.
* Server-only Clerk credentials must remain server-side.
* Use Clerk middleware for authentication boundaries.
* Use server-side Clerk authentication checks for protected server operations.
* Do not assume a user is authorized simply because Clerk authenticated them.
* Map Clerk identity to application-level user/membership records where required.
* Treat Clerk webhook events as untrusted external input until signature and schema validation succeed.
* Clerk webhook processing must be idempotent.
* Authentication failures and authorization failures must be distinguishable in logs and API responses.
* If Clerk configuration changes, update relevant documentation and `Progress tracker.md`.

---

# Logging

* Use structured logging.
* Include correlation IDs.
* Include tenant/user IDs only when appropriate and safe.
* Log important business operations without leaking sensitive information.
* Never log:

  * Passwords.
  * Clerk session tokens.
  * Clerk secret keys.
  * API keys.
  * OAuth secrets.
  * Database credentials.
  * Private keys.
  * Sensitive payment information.
* Never log full authentication/session payloads.
* Use appropriate log levels.
* Avoid excessive debug logging in production.

---

# Observability

Important workflows should be traceable across:

```text
Request
 ↓
Clerk Authentication
 ↓
Application Use Case
 ↓
Database
 ↓
Outbox
 ↓
Worker
 ↓
External Service
```

Use consistent identifiers where appropriate:

```text
requestId
traceId
jobId
eventId
```

---

# Testing Standards

## Unit Tests

Use unit tests for:

* Domain rules.
* Tax calculations.
* GST calculations.
* Accounting calculations.
* Pricing.
* Discount calculations.
* Payment allocation.
* Inventory calculations.
* Validation.
* Permission rules.

## Integration Tests

Use integration tests for:

* Repositories.
* Database transactions.
* Invoice posting.
* Payment recording.
* Inventory updates.
* Accounting posting.
* Outbox behavior.
* AI tool authorization.
* Tenant isolation.
* Clerk-to-application-user mapping where applicable.

## End-to-End Tests

Cover critical journeys:

```text
Sign In with Clerk
 ↓
Create Customer
 ↓
Create Product
 ↓
Create Invoice
 ↓
Record Payment
 ↓
Verify Outstanding
```

and:

```text
Create Purchase
 ↓
Verify Inventory
 ↓
Verify Payable
 ↓
Verify Accounting
```

Also test:

```text
Authenticated User
 ↓
Unauthorized Tenant
 ↓
Access Denied
```

## AI Tests

Test:

* Correct tool selection.
* Tool input validation.
* Tenant isolation.
* Permission enforcement.
* Prompt injection resistance.
* Confirmation requirements.
* Tool failure handling.
* Hallucination-sensitive responses.
* Audit records.
* AI inability to bypass application authorization.

---

# Naming

## Files

Use descriptive names consistent with repository conventions.

Prefer:

```text
create-invoice.ts
invoice-repository.ts
tax-calculator.ts
```

over:

```text
helper.ts
utils2.ts
stuff.ts
```

## Functions

Use verbs for actions:

```text
createInvoice()
calculateTax()
recordPayment()
findOutstandingInvoices()
```

## Booleans

Use:

```text
isActive
isPaid
hasPermission
canEdit
shouldNotify
```

Avoid ambiguous:

```text
active
permission
edit
```

---

# Constants

* Avoid magic numbers.
* Avoid magic strings.
* Centralize business constants.
* Use named constants for statuses, limits, and configuration values.
* Tax rates must not be scattered throughout UI/application code.
* Do not hardcode tenant-specific configuration into source code.

Prefer:

```text
DEFAULT_PAYMENT_TERMS_DAYS
LOW_STOCK_THRESHOLD
```

over:

```text
30
5
```

without context.

---

# Styling

* Follow `UI-Context.md`.
* Use Tailwind CSS.
* Reuse shadcn/ui primitives where appropriate.
* Use design tokens instead of scattered hardcoded styling values.
* Keep responsive behavior consistent.
* Maintain accessibility.
* Avoid inline styles unless technically justified.
* Do not introduce another styling framework without explicit approval.
* Keep business components visually consistent across modules.

---

# UI State Standards

Important screens must explicitly handle:

```text
Loading
Empty
Success
Error
Unauthorized
```

Asynchronous mutations should also handle:

```text
Submitting
Success
Recoverable Error
Retry
```

Avoid unexplained blank screens.

---

# Accessibility

* Use semantic HTML.
* Use accessible labels for form controls.
* Ensure keyboard navigation.
* Maintain sufficient contrast.
* Do not rely exclusively on color to communicate status.
* Use ARIA attributes where necessary.
* Dialogs and popovers must manage focus correctly.
* Tables must remain understandable to assistive technologies.
* Error messages must be associated with relevant fields.

---

# File Organization

Follow the boundaries defined in `Architecture.md`.

```text
app/
```

* Next.js routes, layouts, pages, loading/error boundaries, and application entry points.

```text
modules/
```

* Business domains and domain/application/infrastructure logic.

```text
components/
```

* Reusable UI components.

```text
components/ui/
```

* Generic design-system primitives.

```text
components/business/
```

* Shared business-specific UI components.

```text
lib/
```

* Cross-cutting technical infrastructure.

```text
lib/db/
```

* Prisma/database infrastructure.

```text
lib/auth/
```

* Clerk authentication integration and authentication infrastructure.

```text
lib/security/
```

* Authorization, security utilities, policies, and protection mechanisms.

```text
lib/observability/
```

* Logging, metrics, tracing, and error reporting.

```text
lib/storage/
```

* Object-storage abstraction.

```text
lib/queue/
```

* Queue/background-job infrastructure.

```text
workers/
```

* Background worker implementations.

```text
prisma/
```

* Schema, migrations, and seed configuration.

```text
tests/
```

* Unit, integration, contract, security, and E2E tests.

```text
docs/
```

* Architecture decisions, operational documentation, and development documentation.

---

# Import Rules

* Prefer imports through defined module boundaries.
* Avoid circular dependencies.
* Do not import UI code into domain code.
* Do not import React into domain logic.
* Do not import Prisma into domain logic.
* Do not import AI providers into core business modules.
* Do not import authentication infrastructure into domain logic.
* Do not import Clerk directly into domain logic.
* Do not import one module's internal implementation directly from another module.
* Prefer public module interfaces.

Preferred:

```text
sales
 ↓
accounting public interface
```

Avoid:

```text
sales
 ↓
accounting/infrastructure/internal/prisma-repository
```

---

# Comments and Documentation

Comments should explain:

* Why a non-obvious decision exists.
* Why a workaround is necessary.
* Why a business rule is implemented in a particular way.
* Important financial/tax/accounting assumptions.
* Security-sensitive reasoning.
* Important Clerk integration decisions.

Do not write comments that merely restate code.

Bad:

```text
// Increment count
count++
```

Good:

```text
// Preserve the original posting sequence because journal IDs
// are used for audit ordering within an accounting period.
```

---

# Git and Change Standards

* Keep commits focused.
* Do not mix unrelated changes.
* Do not commit generated build artifacts.
* Do not commit secrets.
* Do not commit debugging code.
* Do not commit commented-out experiments.
* Keep migrations with the feature that requires them.
* Review the final diff before considering work complete.
* Avoid force-pushing shared history unless explicitly required.
* Never rewrite existing applied migration history.

---

# Dependency Standards

Before adding a dependency:

1. Check whether the project already provides equivalent functionality.
2. Prefer existing dependencies.
3. Verify maintenance status.
4. Verify security posture.
5. Verify licensing.
6. Consider bundle/runtime cost.
7. Consider whether the dependency solves a real MVP requirement.

Do not add:

```text
Redis
Kafka
Elasticsearch
Microservices
Vector databases
Workflow engines
```

merely because they may become useful later.

Introduce them only when an actual requirement justifies them.

---

# Performance Standards

* Optimize after measuring.
* Avoid premature optimization.
* Avoid unnecessary client-side JavaScript.
* Avoid unnecessary database queries.
* Avoid N+1 queries.
* Paginate large datasets.
* Select only required database fields.
* Use indexes based on real query patterns.
* Use background jobs for expensive asynchronous work.
* Cache only when there is a demonstrated performance need.
* Never sacrifice financial correctness for performance.
* Do not introduce infrastructure solely to optimize hypothetical scale.

---

# Production Build Standards

Before a feature is considered complete:

* Type checking passes.
* Linting passes.
* Unit tests pass.
* Relevant integration tests pass.
* Relevant E2E tests pass.
* Production build passes.
* Database migrations validate successfully.
* Clerk authentication flows work where applicable.
* Protected routes reject unauthenticated users.
* Unauthorized tenant/resource access is rejected.
* No secrets are exposed.
* No debug code remains.
* No unrelated files are modified.
* Documentation is updated.
* `Progress tracker.md` is updated.

---

# Definition of Done

Code is complete only when:

1. It satisfies the defined requirement.
2. It follows `Architecture.md`.
3. It follows `UI-Context.md`.
4. It follows these coding standards.
5. It uses Clerk for authentication.
6. It does not introduce an alternative authentication system.
7. It preserves tenant isolation.
8. It preserves authorization boundaries.
9. It preserves financial/accounting/GST invariants.
10. It has appropriate runtime validation.
11. It has appropriate automated tests.
12. It handles expected failure states.
13. It is observable where appropriate.
14. AI functionality follows AI safety and tooling rules.
15. No unnecessary dependencies or infrastructure were introduced.
16. The production build passes.
17. The final implementation is documented in `Progress tracker.md`.

---

# Core Engineering Principle

The codebase should consistently favor:

```text
Correctness
    ↓
Clarity
    ↓
Maintainability
    ↓
Security
    ↓
Testability
    ↓
Performance
    ↓
Scalability
```

Do not optimize for the shortest code.

Do not optimize for the newest technology.

Do not optimize for theoretical scale.

Do not introduce infrastructure merely because it may be useful later.

Do not allow AI convenience to bypass application architecture.

Do not allow authentication convenience to bypass Clerk.

**Build the simplest code that correctly represents the business, protects business data, enforces tenant and authorization boundaries, uses Clerk as the single authentication authority, and leaves a clean path for the AI Business OS to evolve.**
