Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

# 31 — Run-After Prod Setup

> Tasks to execute once the application is fully developed and the production environment is configured and running.

## Priority: Low (post-launch)

## Prerequisites

- All feature specs (01–30) are complete or stable.
- Production Clerk instance is provisioned with final settings.
- Production database is migrated and operational.

## Tasks

### 31.1 Enable organization slugs in Clerk and pass slug on org creation

**Context:** During development, the Clerk instance had organization slugs disabled, which caused a 403 `organization_slugs_disabled` error when passing a `slug` parameter to `createOrganization`. The slug was removed as a workaround. Slugs are highly recommended for cleaner, human-readable URLs (e.g. `/org/sharma-traders` instead of `/org/org_3I7uQRbs1FoiCr965V0qGOWWJXO`).

**Steps:**

1. In the Clerk Dashboard → Settings → Organizations, enable **organization slugs**.
2. Update `ClerkOrganizationGateway.createOrganization` in `lib/tenant/clerk-gateways.ts` to pass `slug` again:
   - Reintroduce the `slug` field in the gateway type (`modules/tenant/application/business-setup.ts`).
   - Generate the slug from the business name using `slugifyBusinessName` (already exists in `modules/tenant/schemas/business-profile.schema.ts`).
   - Pass it alongside `name` and `createdBy` in the `createOrganization` call.
3. Verify org creation succeeds with the slug in production.
4. Optionally, backfill slugs for any organizations created during development without one.

### 31.2 Review and tighten Clerk Dashboard organization settings

- Confirm "Allow users to create organizations" is set to the desired policy.
- Review max allowed memberships per organization.
- Ensure webhook endpoints are pointed at the production URL.

## Acceptance

- [ ] Organization slugs enabled in prod Clerk instance.
- [ ] `createOrganization` passes a slug derived from the business name.
- [ ] New businesses get clean, slugified org URLs.
- [ ] Existing orgs are backfilled with slugs (if applicable).
