Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding document metadata and a storage adapter so later expenses, invoices, and receipts can attach files. Production object storage vendor is not chosen here.

### Depends on

- `07-shared-kernel.md`

### Scope

- `lib/storage/` adapter interface: upload, download, delete, content-type, size limits.
- Local/dev implementation (filesystem or equivalent). Production S3-compatible adapter stays behind the interface.
- `modules/documents/`: tenant-scoped metadata (owner record type/id, filename, content type, size, storage key, uploaded by, timestamps).
- Authorization on upload/view/download. Documents are untrusted input — validate type/size; never execute uploaded content.
- Use existing Attachment UI primitive for display where needed; do not modify `components/ui/*`.
- Audit important uploads.

### Do not

- Pick AWS/GCS/Cloudflare R2 or any production vendor in code as “the” provider.
- Store binaries in PostgreSQL.
- Trust client-supplied content-type or path.
- Allow cross-tenant document access.
- Build a generic DAM/product asset manager.

### Follow

- `architecture-context.md` — File and Document Model, File and Upload Security, Invariants 25–26
- `code-standards.md` — Data and Storage, Security
- `ui-context.md` — attachments as evidence, not decoration

### Open questions

Do **not** silently resolve these. Confirm with the project owner before production wiring:

- Which object storage provider should be used? *(this spec: adapter + local/dev only)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- Owner can upload a file in a tenant-scoped way and download it back.
- Another tenant cannot read the object by ID.
- Rejected oversized or disallowed types fail safely.
- Storage adapter is swappable without changing document metadata schema.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `11-customers.md`).
