# 01 — Genuine development employee quick login

**What to build:** Let a developer select any eligible employee in the Expo
development account picker and receive a real mobile session for that employee,
so assigned queues and permissions can be tested without sharing or changing
individual passwords. Keep ordinary password sign-in unchanged and make the
development session operation inaccessible outside development.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Selecting an active internal employee signs the Expo app in with that
      employee's ordinary roles, permissions, sections, and stable identity.
- [ ] Selection does not read, return, replace, reset, or expose the employee's
      password, password hash, master password, or reusable email token.
- [ ] The employee list remains minimal and excludes deleted, revoked, inactive,
      and email-less accounts.
- [ ] The mobile selector and its query are absent outside the Expo development
      runtime.
- [ ] The server session operation rejects every request unless the server is in
      development, even if a non-development client calls it directly.
- [ ] Unknown, malformed, deleted, revoked, and non-internal identities receive
      a generic rejection without account enumeration details.
- [ ] An assigned driver selected through quick login sees only their own queue;
      cross-driver detail access remains forbidden.
- [ ] Focused mobile, authentication, API-security, and preview-build regression
      tests cover success and all development-boundary failures.

