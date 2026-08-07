---
name: Guest mode & dev auto-login
description: How anonymous access, guest metering, and dev auto-login work in the qr-course app.
---

# Access tiers
**Rule:** Three tiers on the API router: public (health), guest-usable (course/tutor/practice/assignments — guests get a per-session `guest_*` id via `identifyUser` and mutating requests are metered by `guestUsageGate`, heavy practice-run create/submit cost 5 units of a 15-unit allowance), and login-only (analytics, assessments/gradebook, diagnostics behind `requireAuth`).
**Why:** Owner wants the site browsable without login, but extensive AI feedback and progress charting require Google sign-in; over-limit responses use 401 `{code:"LOGIN_REQUIRED"}` which the frontend turns into a friendly sign-in dialog (global React Query QueryCache/MutationCache onError). Any hand-rolled fetch wrapper must throw errors with `{status, data}` or the dialog won't trigger.

# Dev auto-login
**Rule:** In non-production, an unauthenticated request is auto-logged-in as the owner account; an explicit logout sets a `devLoggedOut` session flag (session is NOT destroyed in dev, or the flag would vanish and auto-login would return).
**Why:** Owner demanded never being logged out in the development workspace.
**How to apply:** To test guest behavior in dev, POST /api/auth/logout first with a cookie jar — and always curl via `https://$REPLIT_DEV_DOMAIN`, not `http://localhost:80`, because session cookies are Secure and won't round-trip over http (localhost curls silently get a fresh auto-login session every request).
