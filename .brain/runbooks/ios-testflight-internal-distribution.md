# iOS TestFlight Internal Distribution Runbook

## Scope and immutable identifiers

- Apple organization: ZEROES AND ONE TECH HUB NIG LIMITED
- Team ID: `ZXC78SPCV4`
- Account Holder access verified; membership renews September 13, 2027.
- Production bundle ID: `com.gnd.prodesk`
- EAS owner/project: `pcruz321` /
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`
- First audience: employees only. Prefer Internal Testing only for employees who
  can safely be App Store Connect users.

Every command or portal step marked **GATE** changes an external system or uses
credentials. Obtain explicit action-time confirmation before performing it.

## 1. Preflight

1. From the repository root, run `bun run ios:release:check`.
2. Run the focused tests and public Expo config introspection recorded in the
   task file. Confirm `com.gnd.prodesk`, `distribution: store`, `production`
   channel, `pcruz321`, the existing project/update ID, and team
   `ZXC78SPCV4`.
3. Run `EXPO_NO_DOTENV=1 bunx expo install --check`; it must report the SDK
   dependencies up to date. React, React DOM, and React types are intentionally
   excluded because the web workspace uses root 19.2 overrides while mobile
   Metro tests enforce the SDK 54-compatible 19.1 aliases.
4. Run `EXPO_NO_DOTENV=1 bunx expo-doctor`. The currently documented result is
   17/18: Bun's isolated workspace graph leaves duplicate Expo peer
   installations on disk. Confirm the only failure is that known duplicate
   warning and that public config still has
   `experiments.autolinkingModuleResolution: true`; any additional failure is a
   release blocker.
5. Run a production-mode local iOS bundle validation with development
   credentials removed:

   ```sh
   env -u EXPO_PUBLIC_EMAIL -u EXPO_PUBLIC_TOK EXPO_NO_DOTENV=1 bunx expo export --platform ios --output-dir <temporary-dir> --clear
   ```

   Any unresolved Node built-in or bundle failure is a release blocker.
6. Confirm there are no pending changes that would embed development login
   values. Never inspect, copy, or send passwords/OTPs into source control.
7. Confirm the intended build version in `apps/mobile/app.config.ts`; EAS remote
   app-version source and auto-increment own the iOS build number.

## 2. App Store Connect record and agreements

1. Sign in to App Store Connect with the Account Holder or another explicitly
   authorized user. App Store Connect Terms of Service V100 was accepted by the
   Account Holder on September 12, 2026 after explicit action-time approval.
2. Check Business/Agreements for any agreement, tax, or banking item that blocks
   app processing. **GATE:** accept or change only with action-time confirmation.
   The Free Apps Agreement is active. The Paid Apps Agreement remains unaccepted
   and is not required unless GND offers paid apps or in-app purchases.
3. Check EU Digital Services Act trader status. **GATE:** complete the legal and
   contact-information workflow before making the app available in EU storefronts.
4. Search Apps for the GND record with bundle ID `com.gnd.prodesk`. The verified
   activation-day state is `No Apps`; the explicit App ID is now registered and
   selectable in the New App form.
5. If absent, **GATE:** create the app record with platform iOS, the approved
   display name, primary language, bundle ID `com.gnd.prodesk`, and an approved
   unique SKU. Record the numeric Apple app ID for later optional `ascAppId`
   configuration; do not guess it. If the Bundle ID is unavailable, complete
   the explicit App ID registration in section 3 first, then return here.
6. App Store Connect API access currently reports that permission is required
   and offers `Request Access`. Do not request access or create a key for the
   manual first release without separate action-time approval.

## 3. Signing readiness

1. Identifiers contains the explicit App ID `GND Millwork` / `com.gnd.prodesk`
   under team `ZXC78SPCV4`, registered September 12, 2026 after explicit approval.
   Its optional capabilities were left disabled because the native entitlement
   audit found no evidence requiring one. Do not create a wildcard identifier or
   a second bundle identifier.
2. Verify certificates and profiles separately; neither existed during the
   activation-day inspection.
3. Prefer EAS-managed Apple Distribution certificate and App Store provisioning
   profile for the first release.
4. **GATE:** authenticate Apple/EAS, create/reuse certificates, or repair a
   profile only after explicit confirmation. Do not export credentials into the
   repository.
5. If credentials already exist, confirm their team, bundle ID, expiry, and
   revocation state before selecting them. Never revoke a shared certificate as
   a troubleshooting shortcut.

## 4. Build and upload

1. The current machine's EAS session must be authorized for `pcruz321`.
2. Use `bun run eas:auth` to switch credentials and verify identity without
   starting a build, update, upload, or submission. On September 12, 2026 this
   authenticated as `pcruz321` after explicit action-time approval.
3. Run `EXPO_NO_DOTENV=1 eas project:info` and verify
   `@pcruz321/gnd-prodesk` / `8ea2eecb-4109-453c-827f-9b2de2e3a9aa` exactly.
   This linkage was verified on September 12, 2026; do not relink it.
4. For separate review points:
   - **GATE build:** `bun run eas:build:ios`
   - **GATE upload after a successful build:** `bun run eas:submit:ios`
5. For one confirmed combined operation:
   - **GATE build + upload:** `bun run eas:build-submit:ios`
6. The submit command uploads to App Store Connect/TestFlight; it does not
   submit the app for App Store review. Capture the EAS build URL, Apple build
   number, upload outcome, and processing status in the release record.

## 5. Processing and compliance

1. Wait for App Store Connect processing. Inspect any Invalid Binary, signing,
   entitlement, privacy-manifest, icon, or bundle-version error before rebuilding.
2. Confirm export compliance resolves from
   `ITSAppUsesNonExemptEncryption = false`. If app-owned/custom cryptography has
   been introduced, stop and re-audit rather than answering from the old result.
3. Complete required Test Information and compliance/contact fields. **GATE:**
   saving or submitting external forms requires confirmation.

## 6. Tester policy and invitations

### Internal Testing

Use only when each employee can safely hold App Store Connect access. Create a
least-privilege internal group, add the processed build, and add existing App
Store Connect users. **GATE:** changing users/roles, groups, build assignments,
or sending invitations requires confirmation. Record `INVITED`, then record
`ACCEPTED` and `INSTALLED` only after employee confirmation.

### External Testing

Use for ordinary employees who should not have portal access. Create an
employee-only external group, add the build, complete Beta App Review metadata,
and submit the first build for Beta App Review. **GATE:** group creation,
submission, public-link enablement, or invitations requires confirmation. Prefer
email invitations; if a public link is approved, cap testers and distribute the
link only through controlled internal channels. External testing may wait for
Beta App Review.

## 7. Dashboard operating procedure

1. Employee requests iOS or Android in Support > Mobile App.
2. Super Admin reviews identity/need and records Approved or Rejected.
3. Super Admin performs the separately confirmed portal invitation manually.
4. Only after the portal confirms the operation, record Invited and an optional
   non-secret portal reference. Record Accepted/Installed from verified employee
   feedback. Internal notes remain admin-only.
5. Never paste Apple passwords, one-time codes, private keys, issuer IDs, or API
   key material into the dashboard.

## 8. Rollback and troubleshooting

- Failed local readiness: do not build; fix the named invariant.
- EAS unauthorized: run `bun run eas:auth` at the credential gate, then re-check
  project info. Do not relink.
- Bundle ID/team mismatch: stop; verify the App Store Connect record and signing
  profile. Do not create a second app record to bypass it.
- Processing failure: retain logs/build ID, fix the reported native/config issue,
  increment via the production profile, and upload a new build after confirmation.
- Bad binary before tester release: remove it from the tester group or expire it
  in TestFlight after confirmation and select a known-good prior build.
- Bad OTA update: publish a known-good update to the same production channel and
  compatible runtime after confirmation. Native/config/signing changes require a
  new binary.
- Compromised credential: stop distribution, follow Apple/Expo credential
  rotation with explicit authorization, and audit invitation/build events.

## 9. Deferred API automation

Do not create an App Store Connect API key for this release. Later automation
must use the existing server-side secret pattern, least-privilege role, key ID,
issuer ID, and private key references outside browser/database payloads. Replace
the manual adapter only after credential creation/storage and permission changes
are separately approved and audited.
