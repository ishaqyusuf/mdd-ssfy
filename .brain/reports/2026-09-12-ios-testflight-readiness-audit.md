# iOS TestFlight Readiness Audit — 2026-09-12

## Verified account state

- Entity: ZEROES AND ONE TECH HUB NIG LIMITED
- Program/enrollment: Apple Developer Program / Organization
- Current Apple role: Account Holder
- Team ID: `ZXC78SPCV4`
- Membership renewal: September 13, 2027
- License agreement accepted: September 12, 2026
- App Store Connect and Certificates/Identifiers/Profiles are available.
- Read-only activation-day inspection initially found an empty App Store Connect
  Apps list and no identifiers, certificates, provisioning
  profiles, or service keys. After explicit approval, the explicit App ID
  `GND Millwork` / `com.gnd.prodesk` was registered with no optional capabilities.
- After separate explicit approval, the `GND Millwork` iOS app record was created
  with English (U.S.), SKU `gnd-prodesk-ios`, Full Access, and numeric App Store
  Connect app ID `6811442922`.
- The Free Apps Agreement is active for all countries or regions. The Paid Apps
  Agreement is new/unaccepted and is only needed if GND later offers paid apps or
  in-app purchases.
- EU Digital Services Act trader compliance is incomplete. Complete it before
  distributing the app in the EU; it is an external legal/compliance gate.
- App Store Connect Terms of Service V100 was accepted by the Account Holder on
  September 12, 2026 after explicit action-time approval.
- App Store Connect API integrations are now inspectable, but API access reports
  that permission is required and offers `Request Access`. No permission was
  requested and no API key was created.

## Expo and release configuration

- Expo SDK 54, React Native 0.81.5, app version 1.0.305.
- Production bundle ID: `com.gnd.prodesk`; development:
  `com.gnd.prodesk.dev`.
- EAS owner remains `pcruz321`, project ID remains
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`, and the update URL points to that
  project. No transfer or relink was made.
- Production is explicitly store-distributed on the `production` channel;
  preview remains internal/ad-hoc on `preview`.
- EAS uses remote app-version source and auto-increment. The verified App Store
  Connect app ID `6811442922` is pinned in the production submit profile.

## Authentication, permissions, and secrets

- Mobile authentication uses the existing server session/auth paths; the new
  dashboard workflow accepts only authenticated employees with an active role.
- Admin reads/mutations reuse the Super Admin guard and derive actor identity
  from the server context.
- Production scripts strip development quick-login values and prevent dotenv
  reload. No `.env` file or secret was changed.
- Apple passwords, OTPs, and API keys are not collected or stored. The initial
  invitation provider is manual.
- The local EAS CLI session was switched through the repository's configured
  credentials after explicit action-time approval and verified as `pcruz321`.
  `bun run eas:auth` now provides an authentication-only path that cannot start
  a build, update, upload, or submission.

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

- The confirmed first production-build attempt initialized remote iOS build
  number `1` and created the EAS Update `production` channel/branch, but no build
  was queued. Apple password authentication then failed before credential
  creation with `Authentication with Apple Developer Portal failed!` and
  `iTunes service key is empty`.
- This is not evidence of a bad Apple ID. Expo issue `expo/eas-cli#4392` records
  the same current Apple authentication failure on EAS CLI 23.2.0 and 24.3.0;
  changing this machine's EAS 20.2.0 or Node 25 alone is therefore not a
  supported fix.
- The supported fallback is manual Apple signing: Keychain Access generated
  `gnd-millwork-distribution.certSigningRequest` for
  `GND Millwork Distribution`; its private key remains in the local login
  keychain. Apple then created Distribution certificate `ZDC9NMPYX8` and App
  Store profile `GND Millwork App Store` / `6VT956987X` for `com.gnd.prodesk`.
  Both expire September 14, 2027. The downloaded certificate and profile were
  validated, the Apple WWDR G3 intermediate was installed, and Keychain reports
  exactly one valid matching signing identity. An encrypted temporary `.p12`
  containing exactly one private key was exported outside the repository with
  mode `0600`. After separate action-time approval, EAS stored that certificate
  and the profile for `@pcruz321/gnd-prodesk`; all temporary password/private-key
  export files were then removed while the Keychain identity was retained.
- Before upload, resolve any agreement/tax/banking warning that blocks TestFlight.
  The App Store Connect record, EAS account, and retained project link are verified.
- The production App ID, Apple Distribution certificate, App Store profile, and
  local signing identity are now ready. The profile resolves to
  `ZXC78SPCV4.com.gnd.prodesk` with UUID
  `be302ee0-1e9c-4df4-b39d-248ad085c5a4`.
- Production build `3f3a6acf-ac06-42b8-ab72-1837480f49cc` completed on EAS as a
  `STORE` artifact: version `1.0.305`, build `5`, runtime/channel `1.0.305` /
  `production`. The IPA contains the expected bundle, team, active App Store
  profile, `beta-reports-active=true`, `get-task-allow=false`, and
  `ITSAppUsesNonExemptEncryption=false`. Its embedded profile CMS verifies.
- The local macOS `codesign --verify` trust evaluation reported
  `CSSMERR_TP_NOT_TRUSTED` even though `security verify-cert` accepted the
  distribution certificate and EAS signed successfully. Treat this as a local
  Keychain trust-state warning; Apple upload validation remains authoritative.
- A clean detached snapshot of commit `40a62218e` passed 19/19 readiness checks
  and produced submission candidate build `6`, EAS ID
  `f3985128-844d-432c-bbc3-e0e4c93e37ac`, fingerprint
  `02156f5963798fb3909946aa791d2fe5b56bea49`. Its downloaded IPA independently
  confirmed bundle `com.gnd.prodesk`, version `1.0.305`, build `6`, team
  `ZXC78SPCV4`, App Store beta entitlement, `get-task-allow=false`, export
  compliance `false`, and the verified embedded profile. The inspected IPA SHA-256
  was `02a79e923e03f415e8f4db2a867ccd510bedb3b4746e10db0fbc14f98f7990a4`.
- No build was uploaded/submitted to Apple, and no API key, permission, or tester
  invitation was completed. Authorized external changes were accepting
  Terms V100, switching the local EAS session, registering the explicit production
  App ID, creating the App Store Connect app record, initializing build number
  `1`/the production update channel, generating the local CSR/private key, and
  creating and uploading the Apple Distribution certificate/profile to EAS.
  Because the source workspace contained unrelated uncommitted work, build `5`
  is release-path validation only and must not be submitted to Apple. Clean build
  `6` is the prepared candidate at the explicit App Store Connect upload gate.

## Local evidence

- `bun run ios:release:check`: 19/19 checks passed.
- `bunx expo install --check`: dependencies are up to date (with the intentional
  React/React DOM/type exclusions above).
- `bunx expo-doctor`: 17/18 checks passed; the isolated-install duplicate warning
  and its SDK 54 mitigation are documented above.
- Public Expo config resolved SDK 54, production bundle ID, owner, EAS project,
  update URL, export flag, native-module resolution alignment, and empty embedded
  development password correctly.
- `bun run eas:auth` authenticated as `pcruz321`; read-only
  `eas project:info` returned `@pcruz321/gnd-prodesk` and project ID
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`. The iOS build list is empty.
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
