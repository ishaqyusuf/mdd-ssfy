# iOS TestFlight Readiness Audit — 2026-09-12

## Verified account state

- Entity: ZEROES AND ONE TECH HUB NIG LIMITED
- Program/enrollment: Apple Developer Program / Organization
- Current Apple role: Account Holder
- Team ID: `ZXC78SPCV4`
- Membership renewal: September 13, 2027
- License agreement accepted: September 12, 2026
- App Store Connect and Certificates/Identifiers/Profiles are available.

## Expo and release configuration

- Expo SDK 54, React Native 0.81.5, app version 1.0.305.
- Production bundle ID: `com.gnd.prodesk`; development:
  `com.gnd.prodesk.dev`.
- EAS owner remains `pcruz321`, project ID remains
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`, and the update URL points to that
  project. No transfer or relink was made.
- Production is explicitly store-distributed on the `production` channel;
  preview remains internal/ad-hoc on `preview`.
- EAS uses remote app-version source and auto-increment. The App Store Connect
  app ID is intentionally not configured until the app record is verified or
  created at the gated external step.

## Authentication, permissions, and secrets

- Mobile authentication uses the existing server session/auth paths; the new
  dashboard workflow accepts only authenticated employees with an active role.
- Admin reads/mutations reuse the Super Admin guard and derive actor identity
  from the server context.
- Production scripts strip development quick-login values and prevent dotenv
  reload. No `.env` file or secret was changed.
- Apple passwords, OTPs, and API keys are not collected or stored. The initial
  invitation provider is manual.
- The current local EAS CLI session is `ishaqyusuf`, which cannot read the
  authorized `pcruz321` project. Switching/authenticating the EAS session is a
  credential action-time gate.

## Dependencies, permissions, and export compliance

- Expo's SDK 54 compatibility check is clean after pinning NetInfo 11.4.1 and
  updating the Expo patch set to Expo 54.0.37, Constants 18.0.14, File System
  19.0.24, and Updates 29.0.20.
- The repository-wide React 19.2 overrides are intentionally retained for the
  Next.js apps. Mobile Metro maps React and React DOM to explicit 19.1 aliases;
  the dependency validator excludes those intentional resolutions and a Metro
  regression test verifies them.
- Expo Doctor passes 17/18 checks. Its remaining warning reports duplicate Expo
  native-module peer installations in Bun's isolated workspace layout. SDK 54's
  `autolinkingModuleResolution` workaround is enabled and public config confirms
  it, forcing Metro to match the single native installation chosen by Expo
  Autolinking. Re-run Doctor after dependency changes and remove the workaround
  if Bun/Expo later deduplicate the graph cleanly.
- Native permissions found: photo/image selection. A concrete photo-library
  purpose string is configured.
- Networking is HTTPS. Secure storage uses Expo SecureStore/Apple Keychain;
  Sentry and Expo Updates use their platform SDKs.
- `aes-js` exists in dependencies but no mobile source imports it. Repository
  evidence therefore supports `ITSAppUsesNonExemptEncryption = false`: the app
  does not implement or ship app-owned non-exempt encryption. Re-audit if
  custom cryptography is later imported.

## Update strategy

- `updates.checkAutomatically` remains `NEVER`; app-owned update UI/foreground
  logic controls checks. Runtime version follows app version.
- Preview and production channels remain separate. A native rollback uses the
  prior App Store Connect build; an OTA rollback republishes a known-good update
  to the matching runtime/channel.

## Signing assumptions and remaining verification

- EAS-managed signing is the expected first-build path. Certificates and
  provisioning profiles may be created/reused only during the confirmed build
  credential flow.
- Before upload, verify or create the App Store Connect app record for
  `com.gnd.prodesk`, resolve agreements/tax/banking warnings that block TestFlight,
  and authenticate EAS as an authorized `pcruz321` user.
- No Apple app record, signing credential, build, upload, submission, API key,
  permission, or tester invitation was created or changed during this audit.

## Local evidence

- `bun run ios:release:check`: 18/18 checks passed.
- `bunx expo install --check`: dependencies are up to date (with the intentional
  React/React DOM/type exclusions above).
- `bunx expo-doctor`: 17/18 checks passed; the isolated-install duplicate warning
  and its SDK 54 mitigation are documented above.
- Public Expo config resolved SDK 54, production bundle ID, owner, EAS project,
  update URL, export flag, native-module resolution alignment, and empty embedded
  development password correctly.
- A production-mode `expo export --platform ios` initially caught a transitive
  `node:crypto` import from the shared sales schema. The filter contract was
  separated from its server implementation, after which the complete 8,450-module
  iOS bundle exported successfully.
- The sales completion regression suite passed 53 tests / 187 assertions after
  that contract-boundary change.
- Focused release/security tests: 5 passed / 37 assertions before workflow
  integration; final consolidated validation is recorded in the task file.
- Full migration chain, including the mobile-access migration, applied to an
  isolated local validation database; the database was then removed.
