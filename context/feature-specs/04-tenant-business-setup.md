Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

Load and follow the installed **Clerk Cursor Skill** (especially Organizations / webhooks) and current Clerk Next.js docs before writing org/tenant code.

We're adding the application Business/tenant that owns all business data, mapped from **Clerk Organizations**, plus membership and tenant isolation helpers. Multi-user membership starts in this spec.

### Depends on

- `03-authentication-clerk.md`

### Scope

- `modules/tenant/` with Prisma models for Business and Membership.
- Clerk Organizations are the tenant/workspace boundary. Persist an explicit mapping: Clerk Organization id → application Business (`clerkOrganizationId` unique). Document the mapping in the tenant module.
- After sign-in, a user with no organization/business can create one. Creation must create (or attach) a Clerk Organization and the application Business in one owner flow.
- Minimum business fields: name, type, owner, address, phone, email, GST registration status, GSTIN where applicable, financial year, timezone, currency.
- Membership: authenticated Clerk user mapped to application user + membership on the created business. Use Clerk Organization membership as the workspace membership source; keep application Membership for roles used by spec `05`.
- Support multiple members per business from this foundation (invite / add member using Clerk Organization invitation or equivalent official Clerk flow). Do not ship an owner-only model.
- Tenant identity resolved only from trusted server auth context (Clerk Organization + application membership). Never trust a client-supplied `tenantId` or `orgId` as proof of ownership.
- Helpers to require current tenant and fail closed if the user has no membership.
- Settings UI to view/edit the business profile (owner/admin for this spec; finer roles in spec `05`).
- Verified, idempotent webhooks for relevant Organization / organizationMembership lifecycle events, in addition to the user mapping from spec `03`.
- Every future tenant-scoped table must include or resolve to `tenantId` — document the pattern in the tenant module.

### Do not

- Treat Clerk Organizations as a replacement for the application Business record. Clerk owns the workspace identity; the application Business owns GSTIN, financial year, and all business data.
- Let a user read or mutate another business's records by changing IDs in the request.
- Put tenant checks only in the UI.
- Introduce a second authentication or tenancy provider.
- Skip documenting the Clerk Organization ↔ Business mapping.

### Follow

- `architecture-context.md` — Tenant and Membership Model, Authentication vs Authorization, Invariants 4–5
- `code-standards.md` — Multi-Tenant Code, Authorization
- `ui-context.md` — Forms, Create / Edit Workflows, Settings-related layout
- `project-overview.md` — Authentication & Business Setup
- Official Clerk Organizations documentation and the installed Clerk Skill

### Open questions

None remaining.

**Decided:**

- Multi-user: **yes, from foundation** — membership and invite exist here; do not implement owner-only.
- Clerk Organizations: **yes** — they are the tenant/workspace boundary. Application Business remains the owner of business data, keyed by `clerkOrganizationId`.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- A new authenticated user can create a business (Clerk Organization + application Business) and open a tenant-scoped page.
- A second user can be invited/added to the same business and is tenant-isolated from other businesses.
- Tenant id / org id is never accepted from the client as proof of ownership.
- Cross-tenant ID tampering is rejected in a server-side test.
- GSTIN and financial year persist on the business.
- Clerk Organization ↔ Business mapping is documented and unique.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `05-authorization.md`).
