---
name: Google OAuth session store on bundled server
description: connect-pg-simple createTableIfMissing breaks under esbuild bundling; session table must come from drizzle schema. Auth gate ordering in routes/index.ts.
---

# Session store

**Rule:** `connect-pg-simple`'s `createTableIfMissing: true` reads `table.sql` relative to its module dir, which fails with ENOENT once the server is esbuild-bundled. The `user_sessions` table (sid/sess/expire + expire index) is therefore defined in the drizzle schema so `pnpm --filter @workspace/db run push` creates it in every environment (dev and production DBs are separate).

**Why:** First boot after the Clerk→Google OAuth swap failed with `ENOENT .../dist/table.sql`. The canonical auth file must stay verbatim, so the fix lives in the schema, not the auth code.

**How to apply:** After any fresh/production database, run db push before expecting login to work. Never rely on `createTableIfMissing` here.

# Auth gating

**Rule:** In the api-server route index, everything except the health router mounts *after* `requireAuth`. Tutor, detection, and diagnostics make paid OpenAI calls and diagnostics includes a destructive global reset (`POST /diagnostics/reset`, additionally admin-gated via `isAdmin`).

**Why:** Code review caught that mounting these before the auth gate left a public unauthenticated data-wipe endpoint once the app went multi-user.

# Iframe break-out (user-confirmed fix)

**Rule:** Google returns 403 ("you do not have access") when its sign-in page loads inside an iframe, and the Replit preview pane embeds the app in one. The login button must navigate `window.top.location` (new-tab fallback) instead of the iframe's own location.

**Why:** User hit the 403 in the preview; after the top-window redirect fix they confirmed "GOOGLE LOGIN WORKS!".

# Google OAuth operational notes

- Credentials come from secrets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (canonical file checks `GOOGLE_LOGIN_*` first, then `GOOGLE_OAUTH_*`, then `GOOGLE_*`).
- Every domain the app is served from must have `https://<domain>/api/auth/google/callback` registered as a redirect URI in the owner's Google Cloud Console — dev preview domain AND production domain(s).
- Admin (visit analytics, reset) is gated by hardcoded owner email in the auth file.
