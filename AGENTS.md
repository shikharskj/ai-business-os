<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, and scope
2. `context/product-roadmap.md` — Post-MVP sequencing
   (active backlog R1–R7)
3. `context/architecture-context.md` — system structure,
   boundaries, storage model, and invariants
4. `context/ui-context.md` — theme, colors, typography,
   and component conventions
5. `context/code-standards.md` — implementation rules
   and conventions
6. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
7. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

On demand (not every turn): `context/future-scope.md` —
only when planning beyond roadmap R7 or evaluating
out-of-roadmap requests. Do not treat it as the current backlog.

**Post-MVP implementation:** follow numbered specs in
`context/feature-specs-post-mvp/` one at a time (start at
`01-typed-domain-events.md`). MVP archive:
`context/feature-specs-mvp/`. Do not start MVP `29`/`30`
until launch readiness after Post-MVP + future-scope.

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.
