# Tenant module

## Clerk Organization ↔ Application Business

Clerk Organizations are the **workspace / tenant identity boundary**. Each application **Business** stores a unique `clerkOrganizationId` that maps 1:1 to a Clerk Organization.

| Layer | Owns |
| ----- | ---- |
| Clerk Organization | Workspace identity, organization membership at the identity layer |
| Application Business | GSTIN, financial year, timezone, currency, address, and all business data |
| Application Membership | Application roles (`OWNER`, `ADMIN`, …) used by authorization (spec `05`) |

Never treat a client-supplied `tenantId`, `orgId`, or `organizationId` as proof of ownership. Resolve tenant context only from trusted server auth (Clerk session + live membership verification) and application `Membership` rows.

## Tenant scoping pattern

Every tenant-scoped table must include or resolve to `tenantId` (the application Business primary key).

```text
repository.findInvoice({ tenantId, invoiceId })
```

Do not query by resource id alone and check tenant afterward when the query can enforce isolation at the database layer.

## Structure

```text
modules/tenant/
├── domain/           # Types and validation rules (no Clerk imports)
├── schemas/          # Zod input schemas
├── application/      # Use cases (create business, org lifecycle, invites)
├── infrastructure/   # Repository interfaces + Prisma implementations
└── index.ts
```

Clerk SDK calls live in `lib/tenant/` (not in `modules/tenant/`) so domain modules stay free of `@clerk/nextjs`.
