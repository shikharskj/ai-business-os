Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding the server-side authorization/policy layer so every business operation checks permissions, not just authentication.

### Depends on

- `04-tenant-business-setup.md`

### Scope

- `lib/security/` policy helpers used by application use cases.
- Capability/permission strings, for example:
  - `invoice:create` `invoice:read` `invoice:update` `invoice:cancel`
  - `payment:create` `payment:read`
  - `expense:create` `expense:read`
  - `inventory:adjust`
  - `report:read`
  - `accounting:post`
  - plus matching customer, supplier, product, and settings permissions needed by later specs
- Roles as a convenience layer: define `OWNER`, `ADMIN`, `STAFF`, `ACCOUNTANT`.
- Implement **OWNER**, **ADMIN**, **STAFF**, and **ACCOUNTANT** with explicit permission sets. Multi-user is in scope from foundation (spec `04`). OWNER has all MVP permissions.
- Server-side `authorize(user, tenant, permission)` that fails closed.
- UI may hide actions the user cannot perform, but that is not the security boundary.
- Basic member role assignment for users already in the Clerk Organization / application Membership (full invite UX may live in spec `04`; this spec owns the policy).

### Do not

- Authorize only in React components or by hiding buttons.
- Let AI, webhooks, or client payloads supply `role` or `permission`.
- Treat Clerk session or Clerk Organization membership as sufficient authorization for business mutations. Application policy still decides what a member may do.
- Skip STAFF/ACCOUNTANT/ADMIN permission sets. Multi-user is accepted from foundation.

### Follow

- `architecture-context.md` — Authorization Model, Authentication vs Authorization, ADR-002, Invariants 6, 34–35
- `code-standards.md` — Authorization, Authentication and Authorization Code
- `ui-context.md` — Security-Sensitive UI

### Open questions

None remaining.

**Decided:** multi-user is **yes, from foundation**. Productize `OWNER`, `ADMIN`, `STAFF`, and `ACCOUNTANT` in this spec. Clerk Organizations supply workspace membership; this spec still owns application authorization.

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- OWNER can pass policy checks for defined permissions; ADMIN/STAFF/ACCOUNTANT match their defined subsets.
- Missing membership or unknown permission fails closed.
- Use cases that exist today (business profile) go through the policy helper, not UI-only checks.
- Unit tests cover allow/deny for OWNER, a non-owner role, and unauthenticated/no-membership cases.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `06-application-shell.md`).
