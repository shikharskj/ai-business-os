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

Use a **shadcn blocks-style SaaS workspace**: zinc/neutral surfaces, generous whitespace, thin borders, and a high-contrast primary (near-black in light mode, near-white in dark mode).

Light and dark are **first-class**. Both must be readable for lists, forms, financial badges, and the AI assistant. Do not ship a light-only product or skip dark mode to save time.

The visual language should communicate **financial trust and operational clarity**, not an experimental AI product.

Do not invent fake dashboard chrome (Quick Create, decorative revenue charts, Customize Columns). Restyle real screens.

AI functionality should feel integrated into the business application rather than visually dominating it.

Indian business meaning stays semantic: green/amber/red for paid/pending/overdue — not the primary brand color.

---



# Colors

All colors must be defined through CSS custom properties.

**Never hardcode hex colors inside components.**

Canonical tokens are **shadcn CSS variables**. AI Business OS aliases map onto them so older docs and leftover usage stay valid.

Components should prefer Tailwind semantic classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`) over aliases.

## Canonical (shadcn)


| Role                 | CSS Variable             | Light (oklch)           | Dark (oklch)              |
| -------------------- | ------------------------ | ----------------------- | ------------------------- |
| Page background      | `--background`           | `1 0 0` (near white)    | `0.145 0 0` (zinc-950)    |
| Page / body text     | `--foreground`           | `0.145 0 0`             | `0.985 0 0`               |
| Card / surface       | `--card`                 | `1 0 0`                 | `0.205 0 0`               |
| Card text            | `--card-foreground`      | `0.145 0 0`             | `0.985 0 0`               |
| Primary (buttons)    | `--primary`              | `0.205 0 0` (near black)| `0.922 0 0` (near white)  |
| On primary           | `--primary-foreground`   | `0.985 0 0`             | `0.205 0 0`               |
| Muted surface        | `--muted`                | `0.97 0 0`              | `0.269 0 0`               |
| Muted text           | `--muted-foreground`     | `0.556 0 0`             | `0.708 0 0`               |
| Border               | `--border`               | `0.922 0 0`             | `1 0 0 / 10%`             |
| Sidebar              | `--sidebar`              | `0.985 0 0`             | `0.205 0 0`               |
| Chart series 1–4     | `--chart-1` … `--chart-4`| grayscale zinc          | grayscale zinc            |
| Chart accent series  | `--chart-5`              | one muted green accent  | one muted green accent    |


## Compatibility aliases (map to canonical)


| Role                  | CSS Variable              | Maps to                         |
| --------------------- | ------------------------- | ------------------------------- |
| Page background       | `--bg-base`               | `--background`                  |
| Surface               | `--bg-surface`            | `--card`                        |
| Elevated surface      | `--bg-elevated`           | `--card`                        |
| Subtle surface        | `--bg-subtle`             | `--muted`                       |
| Primary text          | `--text-primary`          | `--foreground`                  |
| Secondary text        | `--text-secondary`        | `--muted-foreground`            |
| Muted text            | `--text-muted`            | `--muted-foreground`            |
| Disabled text         | `--text-disabled`         | muted zinc (theme pair)         |
| Primary accent        | `--accent-primary`        | `--primary`                     |
| Primary accent hover  | `--accent-primary-hover`  | `--primary` at ~80%             |
| Primary accent subtle | `--accent-primary-subtle` | `--secondary` / `--muted`       |
| Border default        | `--border-default`        | `--border`                      |
| Border strong         | `--border-strong`         | stronger zinc (theme pair)      |
| State success         | `--state-success`         | financial green (theme pair)    |
| State success subtle  | `--state-success-subtle`  | financial green wash            |
| State warning         | `--state-warning`         | financial amber (theme pair)    |
| State warning subtle  | `--state-warning-subtle`  | financial amber wash            |
| State error           | `--state-error`           | `--destructive` family          |
| State error subtle    | `--state-error-subtle`    | destructive wash                |
| State info            | `--state-info`            | `--foreground` (neutral, not blue brand) |
| State info subtle     | `--state-info-subtle`     | `--muted`                       |


Do not use a blue brand primary. High-contrast black/white primary is the product look.

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

Dark mode is required and uses the same semantic tokens.

Apply a `.dark` class on `html` via `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). Persist the choice (`localStorage`). Put `suppressHydrationWarning` on `<html>`.

Do not create per-component color forks or hardcoded light/dark hex.

Components should consume shadcn tokens (or aliases), not raw light/dark colors:

```text
--background
--foreground
--card
--muted-foreground
--border
--primary
```

Dark mode must preserve:

- Contrast.
- Accessibility.
- Financial state visibility (success / warning / error remain distinguishable).
- Form readability.
- Table readability.
- AI conversation readability.

The workspace top bar includes a theme toggle (Light / Dark / System) at the top right, immediately left of the Clerk `UserButton`. The menu uses dropdown **items** that call `setTheme` (not a radio group). Setup and public/auth headers should expose the same toggle when they have chrome.

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


| Context         | Recommended Style                              |
| --------------- | ---------------------------------------------- |
| Page title      | `text-2xl font-semibold tracking-tight`        |
| Section heading | `text-lg font-semibold`                        |
| Card heading    | `text-base font-medium`                        |
| Body            | `text-base`                                    |
| Secondary text  | `text-base text-muted-foreground`              |
| Caption         | `text-xs text-muted-foreground`                |
| Financial KPI   | `text-2xl font-semibold tracking-tight`        |
| Table text      | `text-base`                                    |
| Metadata        | `text-xs`                                      |


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
| Cards / panels    | `rounded-md`   |
| Large sections    | `rounded-md`   |
| Modals / overlays | `rounded-md`   |
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

The application uses a **business workspace layout**: shadcn `Sidebar` + `SidebarInset`, inset main `bg-background` with comfortable padding (`p-4 md:p-6`).

The workspace shell is viewport-height (`h-svh`): only the **top bar** stays fixed; **main** is the vertical scroll region (`overflow-y-auto`). Page titles and body scroll together.

Typical structure:

```text
┌───────────────┬────────────────────────────────────────────┐
│ Sidebar       │ Top Bar  [trigger] …… [theme] [user]       │
│               ├────────────────────────────────────────────┤
│ Navigation    │ Main Content                               │
│               │ Dashboard / Module / Workflow              │
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
  Quotations
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
Settings
```

The exact navigation must follow `Project overview.md`.

Sidebar rules:

- Use shadcn `Sidebar` primitives (`collapsible="icon"`).
- Header: compact brand tile (icon on `--primary`) plus business name and “Workspace”.
- Menu rows use comfortable height (`h-10` default, `h-9` nested items) at `text-base` with `size-5` icons. Sidebar width is `18rem`. Group labels use `text-sm`.
- Group modules with labels/separators; keep Settings in the footer. The AI assistant opens from the top bar sheet only (not a sidebar nav item).
- Do not add fake Quick Create or unused dashboard shortcuts.
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
[Sidebar trigger]                    [Theme toggle] [User]
```

Required now:

- Sidebar trigger.
- Theme toggle (top-right, immediately left of Clerk `UserButton`).
- User menu (`UserButton`).

Optional later (do not invent chrome before the feature exists):

- Global search.
- Notifications.
- Help.

The top bar should remain visually lightweight (`h-16`, `border-b`, `bg-background`).

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

When KPIs exist, use the **metric card pattern**: muted title, large value (`text-2xl font-semibold tracking-tight`), muted caption. Until then, use the same card chrome for **real tenant facts** (business type, GSTIN, financial year start, role) — never fake revenue or decorative charts.

Prioritize (as data becomes real):

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

- `bg-card`, thin `border-border` / ring, `rounded-md`.
- Clear title (`text-base font-medium` or muted caption).
- Clear primary value.
- Optional supporting information.
- Optional action.

---



# Tables

Tables are a core UI pattern because business applications are data-heavy.

**List screens** (invoices, customers, stock, etc.) use the shared `DataTable` in `components/data-table/` with thin entity wrappers in `components/business/*-data-table.tsx`. Pagination and filtering are **server-driven via URL** (`page`, `pageSize`, plus existing filter params). The client renders only the current page returned by the server — no client-side `slice`, filter, or sort of the full dataset. Pagination controls update the query string so the RSC refetches.

Row order within a page can be changed with the drag handle; order is persisted per tenant + list key (`list_row_orders`) and survives refresh.

**Nested or detail tables** (line items on invoice/quotation detail, payments on invoice detail, etc.) stay on the simple `Table` primitive — do not use the shared DataTable there.

**Sales list rows:** Invoices show amount, derived outstanding, due date (warning tone when overdue), and one payment-facing status badge (`Draft` / `Unpaid` / `Partially paid` / `Paid` / `Cancelled`). Customer names link to the customer hub. Transactional lists (invoices, quotations, payments) disable drag reorder; customers/products may keep reorder when useful.

**Sales detail pages:** One primary header action (Post, Record payment, Mark sent, etc.); secondary actions (Cancel, Export PDF) live in the overflow menu. Overdue receivables show semantic overdue copy beside the due date. Line tables show GST rate and tax amount. Non-draft edit URLs redirect to detail with `?locked=1` instead of 404.

**Customer hub:** Detail page is the sales record for a party — outstanding card, capped related invoices/quotations/payments with “View all” filtered links, New invoice / Record payment when permitted, reactivate for inactive customers.

**Sales forms:** Customer and product fields use the searchable `Combobox`; business dates use the shared `DatePicker` (ISO `value` / `onValueChange`). Line rows show pre-GST subtotal (qty × rate − discount); tax amounts come from the server preview only. “New customer” / “New product” are text links to full create pages (no inline modals).

**Sales hub (`/app/sales`):** Directory cards for Quotations, Invoices, Customers, and Payments (permission-filtered). When the member has `invoice:read`, show open receivables and an overdue shortcut.

Wrap list tables in a shell: `overflow-hidden rounded-md border border-border bg-card`. Keep a toolbar row for GET filter forms above the table; omit `page` on filter submit so results reset to page 1. Include a **Clear** link that drops filter query params (same path, no query).

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
 → Dedicated workflow/page with a live A4 tax-invoice preview

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

1. Daily Brief / Needs attention.
2. Confirm / approve automation actions.
3. Dashboard KPIs.
4. Collections / payments.
5. Invoices (view + create where practical).
6. Stock check / low stock.
7. AI assistant sheet.

Do not aim for a full desktop clone on mobile. Complex accounting/reporting workflows may remain desktop-optimized.

---



# AI Assistant UI

AI should feel like a **business companion**, not a separate chatbot product.

**Entry point:** global top-bar sheet only (no dedicated `/app/assistant` page). Header: title, New chat, Close. Sheet uses `bg-sidebar` (same as the main left sidebar) and is ~`42rem` wide (`data-[side=right]:sm:max-w-[42rem]`), overriding the default sheet `max-w-sm`.

The Daily Brief / Needs attention surface (below) is **not** a second chatbot — it is the Operator entry on the home dashboard. The sheet remains for ask/confirm flows.

Recommended experience:

```text
┌──────────────────────────────────────────────┐
│ Assistant                        New chat  × │
├──────────────────────────────────────────────┤
│         [SVG] How can I help?                │  ← empty: animated welcome
│                                              │
│              Who owes me money?              │  ← user bubble (right)
│                                              │
│ ▸ Thinking → Checking receivables → Writing  │  ← activity timeline
│ No customers currently owe you money.        │  ← lead (semibold)
│ - Supporting point…                          │  ← bullets (normal weight)
│ ┌─ fact card / table ──────────────────────┐ │
│ │ Outstanding   ₹2,45,000                  │ │
│ └──────────────────────────────────────────┘ │
│ [View receivables]                           │
├──────────────────────────────────────────────┤
│ Ask about your business…               [↑]   │
└──────────────────────────────────────────────┘
```

Loading uses an honest tool-activity timeline (Thinking / per-tool steps / Writing answer) from real stream events — not a lone circular spinner and not fake “Thought for N seconds.” Model prose is rendered with a light markdown subset (lead bold, lists); verified numbers stay in fact cards (stacked rows) or a 2-column table when there are 4+ facts. Errors are short and muted.

The AI should be available through:

- Global assistant (top-bar sheet).
- Daily Brief / Needs attention (dashboard Operator surface).
- Contextual actions.
- Suggested actions.
- Inline insights.

---

# Daily Brief / Needs Attention UI

Primary **Operator** surface on `/app` (home dashboard), above or beside KPIs as space allows — one composition, not a second app.

```text
┌─ Needs attention ─────────────────────────────┐
│ Good morning, Ada 🙂 · Yesterday: Sales · Cash in …   │
│ 3 overdue · 2 low stock · 1 idle quote        │
│ Expenses are 91% of taxable sales this period │
│                                               │
│ 🔴 ABC Traders — ₹1.2L overdue                │
│    [Prepare reminder] [View invoice]          │
│ 🟡 Product X — stockout risk                  │
│    [Review stock]                             │
│ 🟡 Quotation QT-12 idle                       │
│    [Follow up]                                │
└───────────────────────────────────────────────┘
```

Rules:

* Ranked by severity; each row links to a domain record.
* Verified amounts come from facts / BusinessState — never invent figures in marketing copy.
* Queue type counts (overdue / low stock / idle quote / unusual expense) summarize open AttentionQueue rows on the same card — not a second Alerts list.
* Period notes (expense ratio, negative profit, payables vs receivables) are L0 inform from dashboard overview money; they are not AttentionQueue rows and have no queue dismiss.
* When AI is down, render a **deterministic** brief from BusinessState (same rows, quieter copy; period notes still from overview facts).
* Actions from the brief use the same confirmation pattern as assistant pending actions. Overdue rows: L1 Recommend “Remind customer”; L2 Prepare reminder (only when the member has `invoice:update`) → `POST /api/assistant/actions/propose` then Confirm on the shared pending-action card → `POST /api/assistant/actions/confirm`. Read-only roles such as ACCOUNTANT keep Recommend + View/Dismiss and never see a Prepare control that would 403. Low stock: Recommend “Reorder”; L2 Prepare purchase (only when the member has `purchase:create`) navigates to new bill and does not post. Idle quote: Recommend “Follow up” + View (no auto-email). Unusual expense: Inform + Recommend “Review expense” + View (no recategorize).
* If confirm fails, keep the pending preview with the error, **Try again**, and **Cancel**. Keep **View** and **Dismiss** on the row so a transient failure does not trap the item behind error-only client state.
* Show the first five open queue rows; “Show more” reveals the rest. Header counts use visible (non-dismissed) rows so optimistic dismiss stays honest.
* Cue that yesterday’s sales/cash-in/expenses are yesterday; KPIs and chart follow the range filter above the canvas.
* Beside KPIs the brief is **content-sized** — do not stretch KPI cards to match a tall brief. On desktop, KPIs and the sales/expenses chart stack in the left column so the chart fills the space under the KPI cards (`gap-6` between KPIs and chart); Needs attention and Recent activity stack in the right column with the same `gap-6` (do not place activity on a second grid row under the left column — that leaves a large blank under the brief). When notes + queue grow (Show more, Prepare confirm), the brief body scrolls under a fixed header (`max-h`).
* Do not duplicate the full chat transcript on the dashboard.
* Do not restore a separate Alerts rail beside Needs attention.
* Typography follows the workspace hierarchy: card title and row titles at `text-base`; body/secondary at `text-sm` or `text-base`; autonomy cues at `text-xs` (never `text-[10px]`); row actions use `size="sm"` buttons. Recent activity uses the same scale (title/amount `text-base`, subtitle `text-sm`, default badge size).
* Greeting copy may include the signed-in first name and a smile (`Good morning, Ada 🙂`) — greeting text only, not an icon affordance.

---

# Autonomy cues (Trust UI)

Label AI and automation affordances consistently:

| Cue | Meaning |
| --- | ------- |
| Inform | L0 — statement of fact / state |
| Recommend | L1 — suggested next step |
| Prepare | L2 — draft ready to review |
| Confirm | L3 — will mutate after explicit confirm |
| Auto (policy) | L4 — may run within tenant limits |

Keep these quieter than primary CTAs; they support trust, they are not badges for decoration.

Owner/admin Settings → Autonomy is where L4 for payment reminders is enabled, with amount ceilings. Chat and Daily Brief still show Confirm until that policy allows a trusted L4 caller (automation runtime in spec `09`; collections vertical in spec `10` auto-sends in-app reminders under that ceiling). Purchase and expense posting cannot be enabled for L4. Settings also lists recent automation runs (optional history — not a new nav item).

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

The assistant sheet labels these bands explicitly:

```text
Verified     → fact cards/tables from tools
Analysis     → model prose (not a source of figures)
Recommend    → next-step lines and prepare chips
Confirm      → pending mutation preview (existing L3 card)
```

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
ABC Traders (link to customer)

GST breakdown | Details (dates, allocated/outstanding, journal link)
Lines
Payments (empty state or receipt table)

Right column:
Sticky tax-invoice preview (~47% scale)
Activity timeline (audit: created / updated / posted / cancelled)
```

Invoice detail uses a responsive two-column layout: workspace cards on the left (Details + GST, Lines, Payments) and a sticky right column with the compact tax-invoice preview plus an Activity timeline underneath (`lg+`). Customer name links to the customer record. Posted invoices with a journal expose **View journal** when the user has `report:read`. Activity lists audit rows for `resource: invoice` only as a vertical timeline (rail + dots).

Create and edit invoice screens use a two-column workspace: the form on the left and a sticky live preview on the right (stacked on small screens). The preview column is `w-full` below `lg` and only uses the A4-scaled width from `lg` up (do not set inline `width`, which overrides fluid layout and can overflow). The preview is a compact (~47% scale) rendering of the same GST Tax Invoice layout used for export; edits refresh the preview live. Preview markup uses workspace semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`); exported PDF always uses a light “paper” hex palette mirrored from those tokens so prints stay readable in any app theme. GST figures appear only after the tax engine prices the draft (`previewInvoice`); the UI does not compute tax. JPEG, PNG, and WebP logos from Settings appear in both the HTML preview and the exported PDF (WebP is converted for pdfkit).

Example quotation:

```text
QTN-1024                  Sent
ABC Traders (link to customer)

GST breakdown | Details (status, dates, converted-invoice link)
Lines

Right column:
Sticky quotation preview (~47% scale)
Activity timeline (audit: created / updated / sent / accepted / converted / cancelled)
```

Quotation detail mirrors invoice detail: GST + Details side by side, lines below, sticky quotation preview and Activity on the right. Create/edit quotation screens use the same two-column live-preview pattern and the same fluid-then-scaled preview column as invoices. Document title is **QUOTATION** with **Quoted by / Quoted to** party labels and **Valid until** instead of due date. PDF export is available only when status is **Sent** or **Accepted** (`exportQuotationPdf`); draft and cancelled quotations show a validation error. Preview and PDF reuse the same theme approach as tax invoices (`invoice-document-theme` paper palette for PDF; semantic tokens in HTML). Logo upload/remove revalidates quotation screens as well as invoices.

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

Use `--chart-1` … `--chart-5` from the theme: grayscale series plus one accent. Do not invent a rainbow palette that fights the neutral workspace.

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
| Inline           | `size-5`              |
| Button           | `size-5`              |
| Navigation       | `size-5`              |
| Important action | `size-5`              |
| Empty state      | `size-10` or larger   |


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

should use the destructive semantic style (`variant="destructive"`).

Primary buttons use high-contrast `--primary` fill (black in light, white in dark). Secondary actions use `variant="outline"`.

Default control size is comfortable: `h-10` with `px-3.5` and `text-base` (icon buttons `size-10`, default icons `size-5`). Keep `sm` / `xs` for dense toolbars only.

Avoid multiple primary buttons competing for attention.

---



# Inputs

Inputs should have:

- Visible labels.
- Clear placeholders only when useful.
- Helper text when necessary.
- Validation states.
- Accessible descriptions.
- Theme tokens (`border-input`, `bg-transparent` / `dark:bg-input/30`) — no hardcoded hex.
- Default height `h-10` with `px-3`, matching buttons and selects (`text-base`, `rounded-md`).

Do not use placeholders as substitutes for labels.

---



# Data Density

The application is business-oriented, so information density should be **moderately high and comfortable** — not compact nova `h-8` chrome.

Prefer:

```text
Readable tables (h-12 heads, px-3 py-3 cells, text-base)
h-10 controls (buttons, inputs, selects)
rounded-md surfaces
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
13. Light and dark both remain readable; theme choice persists across reload.

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

