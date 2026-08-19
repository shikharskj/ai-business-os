AI Business OS — UI Context

## Design Direction

The AI Business OS should feel like a **modern, trustworthy Indian business workspace** — professional enough for accounting and business operations, but significantly simpler and friendlier than traditional ERP software.

The interface should prioritize:

```text
Clarity
 ↓
Speed
 ↓
Trust
 ↓
Actionability
 ↓
Information Density
```

The UI should feel closer to a modern SaaS product such as Linear/Stripe/Notion than a traditional accounting application.

Avoid:

- Cluttered ERP-style screens.
- Excessive borders.
- Excessive gradients.
- Decorative animations.
- Excessive color usage.
- Dense tables without hierarchy.
- Tiny text.
- Unnecessary modal workflows.
- Technical terminology exposed to non-technical business users.

The application should make a small business owner feel:

> "I can understand what is happening in my business immediately."

---



# Theme

Use a **light-first professional business interface** with optional dark mode support only if implementation is straightforward and does not compromise the MVP.

The primary experience should use:

- Warm/neutral page backgrounds.
- White or near-white surfaces.
- Dark readable typography.
- One strong primary accent.
- Green for positive financial/business states.
- Red for errors/negative states.
- Amber for warnings.
- Blue for informational states.

The visual language should communicate **financial trust and operational clarity**, not an experimental AI product.

AI functionality should feel integrated into the business application rather than visually dominating it.

---



# Colors

All colors must be defined through CSS custom properties.

**Never hardcode hex colors inside components.**

Use semantic tokens rather than component-specific colors.


| Role                  | CSS Variable              | Value     |
| --------------------- | ------------------------- | --------- |
| Page background       | `--bg-base`               | `#F8FAFC` |
| Surface               | `--bg-surface`            | `#FFFFFF` |
| Elevated surface      | `--bg-elevated`           | `#FFFFFF` |
| Subtle surface        | `--bg-subtle`             | `#F1F5F9` |
| Primary text          | `--text-primary`          | `#0F172A` |
| Secondary text        | `--text-secondary`        | `#475569` |
| Muted text            | `--text-muted`            | `#64748B` |
| Disabled text         | `--text-disabled`         | `#94A3B8` |
| Primary accent        | `--accent-primary`        | `#2563EB` |
| Primary accent hover  | `--accent-primary-hover`  | `#1D4ED8` |
| Primary accent subtle | `--accent-primary-subtle` | `#EFF6FF` |
| Border default        | `--border-default`        | `#E2E8F0` |
| Border strong         | `--border-strong`         | `#CBD5E1` |
| State success         | `--state-success`         | `#16A34A` |
| State success subtle  | `--state-success-subtle`  | `#F0FDF4` |
| State warning         | `--state-warning`         | `#D97706` |
| State warning subtle  | `--state-warning-subtle`  | `#FFFBEB` |
| State error           | `--state-error`           | `#DC2626` |
| State error subtle    | `--state-error-subtle`    | `#FEF2F2` |
| State info            | `--state-info`            | `#2563EB` |
| State info subtle     | `--state-info-subtle`     | `#EFF6FF` |


---



## Financial Colors

Financial values should use semantic colors consistently.


| Meaning                      | Token             |
| ---------------------------- | ----------------- |
| Positive / received / profit | `--state-success` |
| Negative / overdue / loss    | `--state-error`   |
| Pending / attention required | `--state-warning` |
| Informational                | `--state-info`    |
| Neutral financial value      | `--text-primary`  |


Do not use green/red merely for decoration.

Color should communicate actual business meaning.

For example:

```text
Paid       → Success
Overdue    → Error
Pending    → Warning
Draft      → Neutral
```

---



# Dark Mode

Dark mode may be supported through the same semantic tokens.

Do not create separate component-specific dark-mode values.

Components should consume:

```text
--bg-base
--bg-surface
--text-primary
--text-muted
--border-default
```

rather than directly referencing light/dark colors.

Dark mode must preserve:

- Contrast.
- Accessibility.
- Financial state visibility.
- Form readability.
- Table readability.
- AI conversation readability.

If dark mode significantly increases MVP complexity, prioritize the light theme first.

---



# Typography

Use **Geist Sans** or the project's equivalent modern system-friendly sans-serif.

Use **Geist Mono** or an equivalent monospace font for technical/structured data.


| Role                    | Font       | Variable      |
| ----------------------- | ---------- | ------------- |
| UI text                 | Geist Sans | `--font-sans` |
| Headings                | Geist Sans | `--font-sans` |
| Financial values        | Geist Sans | `--font-sans` |
| Code                    | Geist Mono | `--font-mono` |
| IDs / reference numbers | Geist Mono | `--font-mono` |


---



## Typography Hierarchy


| Context         | Recommended Style            |
| --------------- | ---------------------------- |
| Page title      | `text-2xl font-semibold`     |
| Section heading | `text-lg font-semibold`      |
| Card heading    | `text-sm/medium font-medium` |
| Body            | `text-sm`                    |
| Secondary text  | `text-sm text-muted`         |
| Caption         | `text-xs`                    |
| Financial KPI   | `text-2xl/3xl font-semibold` |
| Table text      | `text-sm`                    |
| Metadata        | `text-xs`                    |


Avoid excessive use of very large headings.

The application is a business workspace, so **information density should remain high without sacrificing readability**.

---



# Number and Financial Formatting

Financial values must be displayed consistently.

Use Indian number formatting:

```text
₹1,25,000
₹12,50,000
₹1,25,00,000
```

Use appropriate currency formatting rather than manually concatenating:

```text
₹ + amount
```

Financial values should visually distinguish:

- Amount.
- Currency.
- Status.
- Percentage.
- Quantity.

Example:

```text
₹1,25,000
Outstanding
```

Avoid unnecessarily decorative financial cards.

---



# Border Radius

Use a consistent radius scale.


| Context           | Class          |
| ----------------- | -------------- |
| Inline / small UI | `rounded-md`   |
| Inputs / buttons  | `rounded-md`   |
| Cards / panels    | `rounded-lg`   |
| Large sections    | `rounded-lg`   |
| Modals / overlays | `rounded-xl`   |
| Pills / statuses  | `rounded-full` |


Avoid excessive use of `rounded-full`.

Pills should primarily be used for:

- Statuses.
- Tags.
- Categories.
- Compact metadata.

---



# Shadows

Use subtle shadows only for elevation.

Preferred hierarchy:

```text
Base
 ↓
Surface
 ↓
Elevated
 ↓
Modal
```

Avoid heavy shadows.

Most cards should rely primarily on:

```text
background
+
border
```

rather than large shadows.

---



# Component Library

Use:

**shadcn/ui + Tailwind CSS**

as the primary UI foundation.

Components live in:

```text
components/ui/
```

Use shadcn/ui primitives wherever appropriate.

Do not recreate common primitives unnecessarily.

Examples:

- Button
- Input
- Select
- Dialog
- Dropdown
- Tooltip
- Popover
- Tabs
- Sheet
- Table
- Badge
- Alert
- Toast
- Calendar
- Command

Customize through composition and design tokens rather than modifying third-party internals unnecessarily.

---



# Component Hierarchy

Prefer:

```text
UI Primitive
    ↓
Shared Business Component
    ↓
Feature Component
    ↓
Page
```

Example:

```text
Button
 ↓
PrimaryActionButton
 ↓
CreateInvoiceButton
 ↓
InvoicePage
```

Do not create extremely generic components that understand every business domain.

---



# Layout

The application uses a **business workspace layout**.

Typical structure:

```text
┌────────────────────────────────────────────────────────────┐
│ Top Bar                                                    │
├───────────────┬────────────────────────────────────────────┤
│               │                                            │
│ Sidebar       │ Main Content                               │
│               │                                            │
│ Navigation    │ Dashboard / Module / Workflow             │
│               │                                            │
│               │                                            │
└───────────────┴────────────────────────────────────────────┘
```

---



# Sidebar

The sidebar is the primary navigation mechanism.

Recommended structure:

```text
Business / Workspace
─────────────────────
Dashboard

Sales
  Invoices
  Customers
  Payments

Purchases
  Suppliers
  Bills
  Payments

Inventory
  Products
  Stock

Expenses

Accounting

Reports

─────────────────────
AI Assistant

Settings
```

The exact navigation must follow `Project overview.md`.

Sidebar rules:

- Fixed or sticky on desktop.
- Collapsible where practical.
- Clearly highlight the current section.
- Avoid more than two levels of nesting.
- Use icons + labels.
- Do not hide critical navigation behind ambiguous icons.
- On mobile, convert to a drawer/sheet.

---



# Top Bar

The top bar should provide global context and actions.

Typical contents:

```text
[Page / Breadcrumb]          [Search] [AI] [Notifications] [User]
```

Potential global actions:

- Global search.
- AI assistant.
- Notifications.
- Help.
- User/workspace menu.

The top bar should remain visually lightweight.

---



# Page Layout

A standard page should generally follow:

```text
Page Header
    ↓
Primary Actions / Filters
    ↓
Main Content
```

Example:

```text
Invoices                           [+ New Invoice]

[Search] [Status] [Date] [More Filters]

┌─────────────────────────────────────────────┐
│ Invoice table                               │
└─────────────────────────────────────────────┘
```

Avoid putting every possible action in the page header.

There should normally be **one obvious primary action**.

---



# Dashboard

The dashboard is the business owner's operational overview.

Prioritize:

```text
Today's Business
      ↓
Cash / Receivables / Payables
      ↓
Sales / Expenses
      ↓
Inventory Alerts
      ↓
Tasks / Attention Required
      ↓
AI Insights
```

Dashboard cards should answer questions such as:

- How much did I sell?
- How much money is outstanding?
- Who owes me money?
- What do I owe suppliers?
- What expenses happened?
- What stock is low?
- What requires my attention?

Avoid dashboards consisting primarily of decorative charts.

---



# Cards

Cards should be used for meaningful information grouping.

Good:

```text
Outstanding Receivables
₹2,45,000
12 customers
```

Bad:

```text
Random metric
Random icon
Random gradient
Random percentage
```

Cards should have:

- Clear title.
- Clear primary value.
- Optional supporting information.
- Optional action.

---



# Tables

Tables are a core UI pattern because business applications are data-heavy.

Tables should:

- Use clear column headers.
- Support sorting where useful.
- Support filtering where useful.
- Support pagination for large datasets.
- Keep important columns visible.
- Align numerical values consistently.
- Use status badges where appropriate.
- Provide row-level actions through a consistent menu.
- Remain readable on smaller screens.

Financial numbers should generally be aligned consistently, preferably right-aligned.

Example:

```text
Invoice       Customer       Date          Amount        Status
INV-001       ABC Traders    18 Aug 2026   ₹45,000       Paid
INV-002       XYZ Store      18 Aug 2026   ₹18,500       Pending
```

---



# Table Interaction

Prefer:

```text
Click row → Open detail
```

and:

```text
Row actions → Edit / View / More
```

Do not make every individual table cell independently clickable.

Use selection only when bulk actions provide real value.

---



# Forms

Forms should feel simple and business-oriented.

Prefer:

```text
Label
Input
Helper text
Validation message
```

Use logical sections for larger forms.

Example:

```text
Customer Details
────────────────────────

Business Name
[________________]

GSTIN
[________________]

Contact
[________________]

Billing Address
[________________]
```

Do not expose database field names directly to users.

---



# Form Validation

Validation should be:

- Immediate where useful.
- Clear.
- Specific.
- Human-readable.

Bad:

```text
Invalid input.
```

Good:

```text
GSTIN must contain 15 characters.
```

Never rely exclusively on red color.

Use:

- Text.
- Icons where appropriate.
- Border/state styling.

---



# Create / Edit Workflows

Prefer dedicated pages or sheets for substantial workflows.

Use:

```text
Small action
 → Dialog / Sheet
```

Use:

```text
Complex business transaction
 → Dedicated page
```

Examples:

```text
Add customer
 → Sheet/Dialog

Create invoice
 → Dedicated workflow/page

Record payment
 → Dialog or focused page depending on complexity
```

---



# Destructive Actions

Destructive actions require clear confirmation.

Examples:

- Delete customer.
- Delete product.
- Cancel invoice.
- Void transaction.
- Remove business data.

Confirmation dialogs should communicate:

```text
What will happen?
Can it be undone?
What records are affected?
```

Avoid generic:

```text
Are you sure?
```

---



# Financial Actions

Financial mutations require extra visual clarity.

For actions such as:

- Record payment.
- Create invoice.
- Cancel invoice.
- Adjust inventory.
- Post accounting transaction.

The UI should clearly communicate:

```text
Action
 ↓
Affected records
 ↓
Amount
 ↓
Result
```

For high-impact operations, show a final confirmation state before execution when appropriate.

---



# Status Badges

Use consistent semantic status badges.

Example:


| Status     | Treatment     |
| ---------- | ------------- |
| Paid       | Success       |
| Active     | Success       |
| Pending    | Warning       |
| Overdue    | Error         |
| Cancelled  | Neutral/Error |
| Draft      | Neutral       |
| Processing | Info          |
| Failed     | Error         |


Do not create arbitrary colors for every status.

---



# Notifications

Use:

### Toasts

For short-lived confirmation:

```text
Invoice created successfully.
```



### Alerts

For persistent important information:

```text
Your GST filing data requires attention.
```



### Inline Errors

For errors associated with a specific form/action.

Do not use toast notifications for critical information that users need to retain.

---



# Empty States

Empty states should explain:

```text
What is empty?
Why is it empty?
What should the user do next?
```

Example:

```text
No invoices yet.

Create your first invoice to start tracking
sales and receivables.

[Create Invoice]
```

Avoid:

```text
No data.
```

---



# Loading States

Prefer skeletons for page-level content.

Use spinners for:

- Buttons.
- Small localized operations.
- Short actions.

Do not block the entire application for a small asynchronous operation.

Buttons should communicate submission state:

```text
[Creating Invoice...]
```

rather than allowing repeated clicks.

---



# Error States

Every important screen should have a meaningful error state.

Example:

```text
Unable to load invoices.

Something went wrong while retrieving your invoices.

[Retry]
```

Do not expose technical stack traces to users.

---



# Responsive Design

The application must be usable on:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Desktop is the primary environment for business operations, but mobile must support common workflows.

### Desktop

Use:

```text
Sidebar + Main Content
```



### Tablet

Use:

```text
Collapsible Sidebar + Main Content
```



### Mobile

Use:

```text
Top Bar
+
Drawer Navigation
+
Single-column Content
```

Tables may become:

```text
Scrollable
```

or:

```text
Card/List representation
```

depending on information density.

---



# Mobile Priorities

Mobile should prioritize:

1. Dashboard.
2. Customers.
3. Invoices.
4. Payments.
5. Expenses.
6. Inventory.
7. AI assistant.

Complex accounting/reporting workflows may remain optimized for desktop if necessary.

---



# AI Assistant UI

AI should feel like a **business copilot**, not a separate chatbot product.

Recommended experience:

```text
┌──────────────────────────────────────────────┐
│ AI Business Assistant                       │
├──────────────────────────────────────────────┤
│                                              │
│ You: Who owes me money?                      │
│                                              │
│ AI: You have ₹2,45,000 outstanding...        │
│                                              │
│ [View Receivables] [Send Reminders]          │
│                                              │
├──────────────────────────────────────────────┤
│ Ask about your business...             [↑]   │
└──────────────────────────────────────────────┘
```

The AI should be available through:

- Global assistant.
- Contextual actions.
- Suggested actions.
- Inline insights.

---



# AI Trust UI

AI responses involving business data should distinguish between:

```text
Verified business data
AI analysis
AI recommendation
```

For example:

```text
Outstanding receivables
₹2,45,000

Based on 14 unpaid invoices.

AI Insight:
Three customers account for 68% of the outstanding amount.
```

The user should be able to understand **where important numbers came from**.

---



# AI Action Confirmation

When AI wants to perform a meaningful mutation:

```text
AI recommendation
      ↓
Action Preview
      ↓
User Confirmation
      ↓
Execution
```

Example:

```text
I found 5 overdue invoices.

I can prepare payment reminders for these customers.

[Review 5 Reminders] [Cancel]
```

For high-impact financial operations, do not make execution look like a normal chat response.

---



# AI Suggested Actions

Use contextual action chips/buttons:

```text
[Create Invoice]
[View Overdue]
[Record Payment]
[Send Reminder]
[Low Stock]
```

Avoid excessive suggestion buttons.

Suggestions should be directly relevant to the current context.

---



# AI Loading State

AI interactions should communicate progress without pretending the model is doing more than it is.

Prefer:

```text
Analyzing your receivables...
```

or:

```text
Checking outstanding invoices...
```

Avoid fake progress indicators.

---



# AI Errors

If the AI cannot complete an operation:

```text
I couldn't complete that action.

No business data was changed.

[Try Again]
```

For mutations, explicitly communicate whether the operation succeeded, failed, or was not executed.

---



# Search

Global search should eventually provide a unified search experience across:

- Customers.
- Suppliers.
- Products.
- Invoices.
- Bills.
- Payments.
- Expenses.
- Transactions.

Search results should show:

```text
Type
Name / Identifier
Relevant metadata
```

Example:

```text
INV-1024
Invoice
ABC Traders
₹45,000 · Pending
```

---



# Filters

Filters should be:

- Discoverable.
- Consistent.
- Reusable.
- URL/state aware where appropriate.

Common filters:

```text
Date
Status
Customer
Supplier
Amount
Payment status
```

Do not expose every possible database field as a filter.

---



# Navigation

Use predictable navigation.

Prefer:

```text
Dashboard
Sales
Purchases
Inventory
Expenses
Accounting
Reports
AI Assistant
Settings
```

Avoid creating a separate top-level navigation item for every small feature.

Group related functionality.

---



# Breadcrumbs

Use breadcrumbs for deeper workflows.

Example:

```text
Sales / Invoices / INV-1024
```

Do not use breadcrumbs on every shallow page where they provide no navigation value.

---



# Detail Pages

A business entity detail page should generally follow:

```text
Header
 ↓
Primary status + actions
 ↓
Key information
 ↓
Financial summary
 ↓
Related records
 ↓
Activity / audit history
```

Example invoice:

```text
INV-1024                  Paid
ABC Traders

₹45,000

Invoice Details
Payment Details
Accounting
Activity
```

---



# Activity / Audit UI

Important business entities should expose useful history.

Example:

```text
18 Aug · Invoice created
18 Aug · Invoice sent
20 Aug · Payment received
20 Aug · Invoice marked paid
```

Activity history should be chronological and understandable.

Avoid exposing internal implementation events unless useful to the business user.

---



# Charts and Analytics

Charts should answer a business question.

Good:

```text
Sales over last 30 days
```

Good:

```text
Outstanding receivables by customer
```

Avoid:

```text
Decorative chart with no actionable meaning
```

Charts should provide accessible textual summaries where appropriate.

---



# Tables vs Charts

Prefer tables when the user needs to:

- Find records.
- Compare exact values.
- Perform actions.
- Export data.

Prefer charts when the user needs to:

- Understand trends.
- Compare categories.
- Identify patterns.
- See high-level performance.

The UI should not force users to interpret a chart when exact values are more useful.

---



# Modals and Sheets

Use dialogs for:

- Confirmations.
- Small forms.
- Focused actions.

Use sheets for:

- Quick create/edit workflows.
- Contextual details.
- Secondary workflows.

Use dedicated pages for:

- Complex transactions.
- Multi-step workflows.
- Large forms.
- Reporting.
- Accounting workflows.

Avoid deeply nested modals.

---



# Tooltips

Use tooltips for unfamiliar icons or secondary functionality.

Do not use tooltips to hide essential information.

Buttons that perform important actions should have visible labels.

---



# Icons

Use **Lucide React**.

Icons should be:

- Stroke-based.
- Simple.
- Consistent.
- Semantically appropriate.

Recommended sizes:


| Context          | Size                  |
| ---------------- | --------------------- |
| Inline           | `h-4 w-4`             |
| Button           | `h-4 w-4`             |
| Navigation       | `h-4 w-4` / `h-5 w-5` |
| Important action | `h-5 w-5`             |
| Empty state      | `h-8 w-8` or larger   |


Avoid mixing multiple icon libraries.

Do not use emojis as primary UI icons.

---



# Buttons

Use a clear hierarchy.

### Primary

One dominant action per context.

```text
[Create Invoice]
```



### Secondary

Supporting actions.

```text
[Export]
[Filter]
```



### Destructive

Actions such as:

```text
[Delete]
[Cancel Invoice]
```

should use the destructive semantic style.

Avoid multiple primary buttons competing for attention.

---



# Inputs

Inputs should have:

- Visible labels.
- Clear placeholders only when useful.
- Helper text when necessary.
- Validation states.
- Accessible descriptions.

Do not use placeholders as substitutes for labels.

---



# Data Density

The application is business-oriented, so information density should be **moderately high**.

Prefer:

```text
Compact but readable tables
Compact cards
Consistent spacing
Clear hierarchy
```

Avoid:

```text
Huge empty spaces
Oversized typography
Decorative cards
Excessive padding
```

The UI should optimize for users who may work with hundreds or thousands of business records.

---



# Spacing

Use Tailwind's spacing scale consistently.

Prefer:

```text
gap-2
gap-3
gap-4
gap-6
gap-8
```

Avoid arbitrary values unless genuinely required.

Typical hierarchy:

```text
Related controls       → gap-2 / gap-3
Form fields            → gap-4
Sections               → gap-6
Major page sections    → gap-8
```

---



# Accessibility

The UI must support:

- Keyboard navigation.
- Screen readers.
- Visible focus states.
- Semantic HTML.
- Sufficient contrast.
- Accessible form labels.
- Accessible dialogs.
- Accessible tables.
- Reduced-motion preferences where animations exist.

Never communicate business-critical information through color alone.

---



# Motion

Motion should be subtle and purposeful.

Use animation for:

- Dialog transitions.
- Drawer transitions.
- Loading states.
- Small state changes.
- AI response appearance.

Avoid:

- Excessive bouncing.
- Large page transitions.
- Decorative animations.
- Long animations that slow down workflows.

Respect `prefers-reduced-motion`.

---



# Toast and Feedback Timing

Success notifications should generally be short-lived.

Errors that require user action should remain visible until understood or dismissed.

Do not stack large numbers of toasts.

For important financial actions, prefer a persistent result state in addition to a toast.

---



# Security-Sensitive UI

Never expose:

- API keys.
- Authentication tokens.
- Internal database identifiers unnecessarily.
- Sensitive credentials.
- Hidden system prompts.
- AI tool credentials.

Permission-denied states should explain the problem without revealing sensitive authorization details.

Example:

```text
You don't have permission to perform this action.
```

---



# UI Architecture Rules

UI components must not contain:

- Direct database queries.
- Accounting posting logic.
- GST calculation logic.
- Inventory valuation logic.
- Authorization decisions.
- AI provider calls.
- Secret credentials.

Instead:

```text
UI
 ↓
Application API / Server Action
 ↓
Use Case
 ↓
Domain
```

---



# UI Consistency Rules

The same concept must look and behave the same throughout the application.

For example:

**Paid**

must use the same:

- Badge treatment.
- Color.
- Icon convention.
- Terminology.

across:

```text
Dashboard
Invoices
Customer
Payments
Reports
AI Assistant
```

Do not create feature-specific visual interpretations of existing business states.

---



# Terminology

Use business-friendly terminology.

Prefer:

```text
Customer
Supplier
Invoice
Bill
Payment
Expense
Product
Stock
Sales
Purchase
Profit
Outstanding
```

Avoid exposing technical terminology such as:

```text
Entity
Record
Mutation
Repository
Payload
Event
Job
```

unless the user is explicitly viewing a technical/admin interface.

---



# Indian Business UX

The MVP is designed primarily for small Indian businesses.

The UI should support Indian business conventions naturally:

- ₹ currency formatting.
- Indian number grouping.
- GSTIN.
- HSN/SAC.
- CGST.
- SGST.
- IGST.
- Invoice numbering.
- Indian addresses.
- Indian phone numbers.
- Indian date conventions where appropriate.
- UPI/payment-related workflows where included in scope.

Do not make the UI feel like an American accounting product with Indian tax fields bolted onto it.

---



# Trust and Transparency

Because this application manages business and financial information, visual design should reinforce trust.

Important actions should be explicit.

Important numbers should have context.

AI-generated insights should be distinguishable from authoritative records.

Financial mutations should provide clear feedback.

The user should always understand:

```text
What happened?
Why did it happen?
What changed?
What can I do next?
```

---



# UI Definition of Done

A UI feature is complete when:

1. It follows this UI context.
2. It uses existing design-system components where appropriate.
3. It uses semantic color tokens.
4. It is responsive.
5. It has loading, empty, error, and success states where applicable.
6. Forms have proper validation and accessible labels.
7. Destructive actions have appropriate confirmation.
8. Financial information is formatted consistently.
9. Unauthorized actions are handled correctly.
10. AI actions clearly communicate their status and consequences.
11. Keyboard accessibility is preserved.
12. No unnecessary visual patterns or dependencies were introduced.

---



# Core UI Principle

The AI Business OS should feel like:

```text
A modern SaaS product
        +
A trustworthy accounting system
        +
A simple business dashboard
        +
An intelligent business copilot
```

—not like a traditional ERP with an AI chatbot attached.

**Every screen should answer three questions clearly:**

```text
Where am I?
What is happening?
What should I do next?
```

