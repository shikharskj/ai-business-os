Read `AGENTS.md` before starting.

Read:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Mark this spec **In Progress** in `context/progress-tracker.md` before coding.

Load and follow the installed **Clerk Cursor Skill** and current Clerk Next.js docs before writing any auth code.

We're adding Clerk as the sole authentication provider: sign-up, sign-in, sign-out, sessions, protected routes, and trusted server-side identity.

### Depends on

- `02-project-foundation.md`

### Scope

- Install and configure `@clerk/nextjs` for the App Router.
- `ClerkProvider` in the root layout.
- `clerkMiddleware()` protecting application routes; keep sign-in/sign-up public.
- Sign-up, sign-in, and sign-out using Clerk-hosted or Clerk-provided UI — do not invent a custom password stack.
- Server-side current-user resolution from Clerk auth context (`lib/auth/`).
- Map Clerk user id → application user record (webhook `user.created` / relevant lifecycle events). Webhooks must be verified, validated, and idempotent.
- Unauthenticated users cannot access protected pages or server resources.
- Fail closed on authentication failure.
- Keep Clerk secret keys server-only. Never expose them to the client.

### Do not

- Add Auth.js, Better Auth, NextAuth, Supabase Auth, Firebase Auth, custom JWT/session cookies, or a second auth provider.
- Treat frontend signed-in state as authorization.
- Accept a client-supplied `userId` instead of Clerk server identity.
- Use Clerk Organizations as the business/tenant model (see spec `04`).
- Put Clerk types or SDK calls inside domain modules.
- Hard-code secrets.

### Follow

- `architecture-context.md` — Authentication Architecture, Clerk Identity Model, Clerk Authentication Boundary, ADR-001 through ADR-003, Invariants 1–3 and 34–37
- `code-standards.md` — Authentication — Clerk, Middleware, Webhooks, Clerk Integration Rules
- `ai-workflow-rules.md` — Clerk Skill workflow
- Official Clerk Next.js documentation and the installed Clerk Skill

### Open questions

None for the auth provider (Clerk is already accepted).

Do **not** silently resolve related items; confirm with the project owner if they come up:

- Should Clerk Organizations be used for multi-user business/workspace membership, or should the MVP use an application-level Business membership model backed by Clerk user identity? *(this spec: Clerk identity only; membership is spec `04`)*

See `context/progress-tracker.md` → Open Questions.

### Check when done

- User can sign up, sign in, receive a session, access a protected page, resolve current user server-side, and sign out.
- Unauthenticated requests to protected resources fail closed.
- No Clerk secret is exposed to the client.
- Webhook handler verifies Clerk signatures and is idempotent.
- Domain modules do not import `@clerk/nextjs`.
- Relevant authentication tests pass.
- Production build succeeds.
- `context/progress-tracker.md` is updated (this spec Complete; next is `04-tenant-business-setup.md`).
