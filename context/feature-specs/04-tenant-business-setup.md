Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the application Business/tenant that owns all business data, plus owner membership and tenant isolation helpers.

### Depends on

- `03-authentication-clerk.md`

### Scope

- `modules/tenant/` with Prisma models for Business and Membership.
- After sign-in, a user with no business can create one.
- Minimum business fields: name, type, owner, address, phone, email, GST registration status, GSTIN where applicable, financial year, timezone, currency.
- Membership: authenticated Clerk user mapped to application user + `OWNER` membership on the created business.
- Tenant identity resolved only from trusted server auth context + membership. Never trust a client-supplied `tenantId`.
- Helpers to require current tenant and fail closed if the user has no membership.
- Settings UI to view/edit the business profile (owner only for this spec).
- Every future tenant-scoped table must include or resolve to `tenantId` — document the pattern in the tenant module.

### Do not

- Use Clerk Organizations/Workspaces as the tenant model unless later explicitly approved in architecture.
- Implement full multi-user invite/admin/staff product flows. MVP starts **owner-only**. Do not pretend multi-user is complete.
- Let a user read or mutate another business's records by changing IDs in the request.
- Put tenant checks only in the UI.
- Introduce a second authentication or tenancy provider.

### Follow

- `architecture-context.md` — Tenant and Membership Model, Authentication vs Authorization, Invariants 4–5
- `code-standards.md` — Multi-Tenant Code, Authorization
- `ui-context.md` — Forms, Create / Edit Workflows, Settings-related layout
- `project-overview.md` — Authentication & Business Setup

### Open questions

Do **not** silently resolve these. Confirm with the project owner before expanding beyond owner-only:

- Should the MVP support multiple users per business immediately or begin with owner-only access? *(this spec: owner-only)*
- Should Clerk Organizations be used for multi-user business/workspace membership, or should the MVP use an application-level Business membership model backed by Clerk user identity? *(this spec: application-level membership)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- A new authenticated user can create a business and open a tenant-scoped page.
- Tenant id is never accepted from the client as proof of ownership.
- Cross-tenant ID tampering is rejected in a server-side test.
- GSTIN and financial year persist on the business.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `05-authorization.md`).
