Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/product-roadmap.md`
3. `context/architecture-context.md`
4. `context/ui-context.md`
5. `context/code-standards.md`
6. `context/ai-workflow-rules.md`
7. `context/progress-tracker.md`

Do **not** implement items from `context/future-scope.md`.

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

We're adding a **tenant autonomy policy** model (L0–L4 configuration: allowed action classes, amount thresholds, require-confirmation-above, disabled automations) that tools and later automation must consult. L5 remains forbidden.

### Depends on

- `01-typed-domain-events.md`
- MVP assistant confirm path (L3 tokens)

### Scope

- Persist per-tenant autonomy policy (defaults safe: L4 off or empty allow-list).
- Settings UI or minimal owner-only settings to edit thresholds / enable L4 for low-risk classes (e.g. reminder under amount).
- Tool/action metadata declares autonomy level; `executeAiTool` / confirm path checks policy for L4 attempts.
- Document mapping: existing `send_payment_reminders` = L3 by default; L4 only if policy enables + under threshold.
- Audit policy changes.

### Do not

- Enable unrestricted L5 or silent invoice posting at L4.
- Bypass HMAC confirm for L3.
- Build full automation runtime (spec `09`) — only the policy store and enforcement hooks.

### Follow

- `architecture-context.md` — AI Autonomy Model, Tenant autonomy policy
- `code-standards.md` — Autonomy metadata
- `product-roadmap.md` — Autonomy L0–L4
- `ui-context.md` — Autonomy cues

### Open questions

None remaining.

**Decided:** L4 only behind explicit tenant config + thresholds; L3 keeps confirm tokens; L5 forbidden.

### Check when done

- Tenant policy can be read/updated by authorized owner/admin.
- L4 action is rejected when policy disabled or over threshold.
- L3 confirm path unchanged for reminders.
- Policy changes are audited.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `09-automation-runtime.md`).
