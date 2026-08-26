# Audit fix Wave 0 — shared contracts (supervisor)

Workers must honor these without inventing alternatives.

## Invitation role metadata

- Key: `appMembershipRole` (`APP_MEMBERSHIP_ROLE_METADATA_KEY` in `modules/tenant/domain/invite-metadata.ts`)
- Values: `ADMIN` | `STAFF` | `ACCOUNTANT` (never invite as OWNER via metadata)
- Set on Clerk organization invitation `publicMetadata` when inviting
- On `organizationMembership.created` / `updated`: prefer metadata role; OWNER only when `business.ownerUserId === applicationUserId`
- Do **not** map blanket `org:admin` → OWNER

## Journal uniqueness

- Prisma: `Journal` `@@unique([tenantId, sourceType, sourceId])`
- Migration name: `YYYYMMDDHHMMSS_journal_source_unique` (Infra owns)
- Domain post paths rely on this + `expectedStatus: "DRAFT"` + row locks

## Cron / public API

- `/api/internal/outbox/process` is public (no Clerk session) — already in `lib/auth/public-routes.ts`
- Authz = `Authorization: Bearer ${CRON_SECRET}` only; fail closed in production if secret missing

## Authz HTTP mapping

- Helper: `lib/http/auth-errors.ts` → `authzErrorResponse(error)`
- AuthenticationError / TenantRequiredError → 401
- TenantAccessDenied / TenantMembershipUnavailable / BusinessSettingsForbidden / AuthorizationError → 403

## Path ownership (do not cross)

| Agent | Paths |
|-------|--------|
| Auth | modules/tenant, lib/tenant, lib/auth, proxy.ts, webhooks, internal outbox route polish, app/app/actions invite, wire authzErrorResponse |
| Domain | modules/sales, purchases, payments (helpers), inventory, tax PoS, related workspace actions |
| Infra | prisma/*, CI, package.json scripts, run-production-build, netlify.toml, .env.example, lib/db/client, lib/env openai drop, new tests |
| UI | hooks/use-mobile, components/shell, payment form prefill, detail menus, list-filter-bar, customer detail chrome |

## Shared note — `scheduleNotificationOutboxProcessing` wiring (Domain/Auth)

Already scheduled after mutation (keep as reference):

- `sales/invoices/actions` — create + post + cancel
- `sales/payments/actions` — record customer payment + apply advance / apply credit
- `sales/quotations/actions` — create / update / status / convert
- `sales/orders/actions` — create / update / confirm / cancel / convert
- `sales/credit-notes/actions` — create / update / post / cancel
- `purchases/bills/actions` — create / update / post / cancel
- `purchases/payments/actions` — record supplier payment
- `purchases/returns/actions` — create / update / post / cancel
- `expenses/actions` — record expense
- `inventory/stock/actions` — adjust + opening stock
- `inventory/products/actions` — create / update
- `accounting/actions` — period close / post adjustment / reverse journal

All Wave 0 deferred action paths wired.
