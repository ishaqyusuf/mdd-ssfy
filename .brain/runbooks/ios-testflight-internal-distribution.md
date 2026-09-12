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
3. Confirm there are no pending changes that would embed development login
   values. Never inspect, copy, or send passwords/OTPs into source control.
4. Confirm the intended build version in `apps/mobile/app.config.ts`; EAS remote
   app-version source and auto-increment own the iOS build number.

## 2. App Store Connect record and agreements

1. **GATE:** Sign in to App Store Connect with the Account Holder or another
   explicitly authorized user.
2. Check Business/Agreements for any agreement, tax, or banking item that blocks
   app processing. **GATE:** accept or change only with action-time confirmation.
3. Search Apps for the GND record with bundle ID `com.gnd.prodesk`.
4. If absent, **GATE:** create the app record with platform iOS, the approved
   display name, primary language, bundle ID `com.gnd.prodesk`, and an approved
   unique SKU. Record the numeric Apple app ID for later optional `ascAppId`
   configuration; do not guess it.

## 3. Signing readiness

1. Verify Identifiers contains `com.gnd.prodesk` under team `ZXC78SPCV4`.
2. Prefer EAS-managed Apple Distribution certificate and App Store provisioning
   profile for the first release.
3. **GATE:** authenticate Apple/EAS, create/reuse certificates, or repair a
   profile only after explicit confirmation. Do not export credentials into the
   repository.
4. If credentials already exist, confirm their team, bundle ID, expiry, and
   revocation state before selecting them. Never revoke a shared certificate as
   a troubleshooting shortcut.

## 4. Build and upload

1. The current machine's EAS session must be authorized for `pcruz321`. The
   read-only audit found `ishaqyusuf`, which cannot read the project.
2. **GATE:** after confirmation, authenticate/switch EAS using the established
   account runner, then re-run `eas project:info --json` and verify the owner and
   project ID exactly.
3. For separate review points:
   - **GATE build:** `bun run eas:build:ios`
   - **GATE upload after a successful build:** `bun run eas:submit:ios`
4. For one confirmed combined operation:
   - **GATE build + upload:** `bun run eas:build-submit:ios`
5. The submit command uploads to App Store Connect/TestFlight; it does not
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
- EAS unauthorized: run `eas whoami`, authenticate the authorized `pcruz321`
  account at the credential gate, then re-check project info. Do not relink.
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
