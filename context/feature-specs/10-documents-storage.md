Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding document metadata and a storage adapter so later expenses, invoices, and receipts can attach files. Production object storage is **Cloudflare R2**; this spec still ships a local/dev adapter behind the same interface.

### Depends on

- `07-shared-kernel.md`

### Scope

- `lib/storage/` adapter interface: upload, download, delete, content-type, size limits.
- Local/dev implementation (filesystem or equivalent). Production adapter is **Cloudflare R2** (S3-compatible) behind the same interface. Production adapter selection fails closed: missing or invalid R2 configuration must reject startup or adapter initialization — never silently fall back to local/filesystem storage. Local storage is only for explicitly configured local/dev environments, enforced by adapter selection plus env/feature-flag validation. This spec may document R2 env vars and implement the R2 adapter, or leave R2 wiring to spec `30` if only the interface + local adapter land here — prefer implementing the R2 adapter behind feature flags/env so production is not a rewrite.
- `modules/documents/`: tenant-scoped metadata (owner record type/id, filename, content type, size, storage key, uploaded by, timestamps).
- Authorization on upload/view/download. Documents are untrusted input — validate type/size; never execute uploaded content.
- Use existing Attachment UI primitive for display where needed; do not modify `components/ui/*`.
- Audit important uploads.

### Do not

- Pick AWS, GCS, or another production vendor instead of Cloudflare R2.
- Skip the storage adapter and call R2 from domain modules.
- Store binaries in PostgreSQL.
- Trust client-supplied content-type or path.
- Allow cross-tenant document access.
- Build a generic DAM/product asset manager.

### Follow

- `architecture-context.md` — File and Document Model, File and Upload Security, Invariants 25–26
- `code-standards.md` — Data and Storage, Security
- `ui-context.md` — attachments as evidence, not decoration

### Open questions

None remaining.

**Decided:** object storage is **Cloudflare R2**. This spec keeps an adapter: local/dev implementation required; R2 is the production target (S3-compatible, no egress fees).

See `context/progress-tracker.md` → Architecture Decisions.

### Check when done

- Owner can upload a file in a tenant-scoped way and download it back.
- Another tenant cannot read the object by ID.
- Rejected oversized or disallowed types fail safely.
- Storage adapter is swappable without changing document metadata schema.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `11-customers.md`).
