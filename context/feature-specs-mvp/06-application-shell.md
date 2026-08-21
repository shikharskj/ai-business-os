Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the authenticated business workspace shell: sidebar, top bar, page chrome, and placeholder routes so later modules drop into a consistent layout.

### Depends on

- `05-authorization.md`

### Scope

- Authenticated app layout using existing shadcn Sidebar primitives (do not fork `components/ui/*`).
- Structure from UI context:

```text
Business / Workspace
─────────────────────
Dashboard
Sales (Invoices, Customers, Payments)
Purchases (Suppliers, Bills, Payments)
Inventory (Products, Stock)
Expenses
Accounting
Reports
─────────────────────
AI Assistant
Settings
```

- Top bar: page/breadcrumb area, slots for search, AI, notifications, and user/workspace menu. Search/AI/notifications can be non-functional placeholders until their specs.
- Standard page header + primary action + content region.
- Loading, empty, and error shells reused by later pages.
- Settings entry that opens the business profile from spec `04`.
- After sign-in + business setup, land in the shell (dashboard route may be a placeholder until spec `23`).
- Responsive: sidebar becomes a sheet/drawer on mobile.

### Do not

- Build customers, invoices, or other module UIs in this spec.
- Recreate design-system primitives or hard-code hex colors.
- Put business rules or Prisma in layout components.
- Hide critical navigation behind icon-only controls on desktop.

### Follow

- `ui-context.md` — Layout, Sidebar, Top Bar, Page Layout, Empty States, Loading States, Error States, Responsive Design, Terminology
- `code-standards.md` — React / Next.js, Component Responsibility, Styling, UI State Standards
- `architecture-context.md` — `app/` vs `components/` vs `modules/`

### Open questions

None for the shell itself.

Placeholder nav items that are not yet implemented must not pretend the feature exists (disabled or “coming” empty state is fine).

### Check when done

- Authenticated application member with an active application Membership on a Business sees the workspace shell. Clerk Organization membership alone is insufficient.
- Current section is highlighted.
- Unauthenticated users never see the shell.
- Mobile navigation works via drawer/sheet.
- Placeholder module routes render empty/coming states without errors.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `07-shared-kernel.md`).
