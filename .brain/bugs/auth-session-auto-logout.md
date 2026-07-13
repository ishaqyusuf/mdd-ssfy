# Bug Template

## Title
Frequent auto logout caused by short-lived server session rows.

## Summary
Users were being signed out unexpectedly because the auth system validated every JWT against a `Session` database row that expired after 1 hour, even though the JWT itself remained valid much longer.

## Impact
- Affected web users and any shared auth surfaces using `@gnd/auth`.
- Severity: High, because active sessions could be dropped during normal usage or when the same account signed in elsewhere.

## Root Cause
The backing `Session` row created during login used a 1-hour expiry and was treated as the authoritative session check on every request. Login also deleted all existing sessions for the same user, so signing in on another device invalidated the current device immediately.

## Fix
Auth login now creates session rows with a 7-day expiry, keeps other live sessions intact, and refreshes the current session expiry when it is nearing expiration.

## Prevention
- Keep JWT and backing session lifetimes aligned.
- Avoid single-session invalidation unless product requirements explicitly call for it.
- Add focused auth/session regression coverage when the current auth layer gets test coverage.
