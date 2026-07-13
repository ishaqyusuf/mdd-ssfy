# Spec: App Auto Update Parity

## Tracker

- Local Only: yes
- Triage Label: `ready-for-agent`
- Created Date: 2026-07-12
- Reference Implementation: local `al-ghurobaa` Expo app auto-update flow

## Problem Statement

GND mobile users rely on the installed Expo app for sales, jobs, dispatch, warehouse, and office workflows. When a new OTA update is published, users can remain on an older JavaScript bundle until they manually open Settings > App Updates and check/download/restart. That creates avoidable support friction: fixes can be published, but field and office devices may still run stale behavior during the workday.

The user asked to add the app auto-update feature "as in alghurobaa", meaning the GND Expo app should automatically check for EAS updates in installed builds, download an available update, show a clear update progress surface, and restart into the updated app without requiring the user to discover the manual update screen.

## Solution

Bring GND's Expo update behavior in line with the local `al-ghurobaa` app pattern while preserving the existing GND manual update diagnostics screen.

When the installed GND mobile app launches, it should silently check the configured EAS Update channel. If an update is available for the current runtime, the app should show a full-screen update modal, download the update, move through visible Downloading, Updating, and Restarting steps, then reload into the new update. If no update is available or the check fails, app launch should continue without disruptive UI.

The app should also support a foreground auto-check after the app returns from background, with a cooldown so users do not trigger repeated update checks while moving between apps. Foreground checking should be configurable through Expo config/env values, matching the al-ghurobaa behavior. Manual Settings > App Updates remains available for diagnostics, retries, and support.

Because GND has data-entry workflows such as mobile invoices, quotes, jobs, dispatch, and warehouse packing, implementation should explicitly decide how auto-restart behaves when the user is saving, submitting, or editing unsaved local state. The default target is al-ghurobaa-style automatic restart, but GND should not silently discard active work.

## User Stories

1. As a mobile app user, I want the app to check for published updates when it starts, so that I receive fixes without manually opening Settings.
2. As a mobile app user, I want update checks to be silent when no update is available, so that normal launch is not interrupted.
3. As a mobile app user, I want update-check failures to be non-blocking, so that a temporary network or EAS issue does not stop me from using the app.
4. As a mobile app user, I want the app to show a clear full-screen update modal when an update is being applied, so that I understand why the app is temporarily unavailable.
5. As a mobile app user, I want to see Downloading, Updating, and Restarting steps, so that the update process feels predictable.
6. As a mobile app user, I want to see download progress while the update downloads, so that I know the app is still working.
7. As a mobile app user, I want the app to restart automatically after the update is ready, so that I do not have to press extra buttons.
8. As a mobile app user, I want the app to restart into the newly downloaded update, so that the published fix actually takes effect.
9. As a mobile app user, I want a readable failure state if download or reload fails, so that I can continue using the current app and retry later.
10. As a mobile app user, I want the failure state to be dismissible, so that a failed update does not block urgent work.
11. As a mobile app user, I want the app to check again after returning from the background, so that updates published during the day can reach my device.
12. As a mobile app user, I want foreground checks to be throttled, so that switching apps does not repeatedly trigger update traffic.
13. As a mobile app user, I want update checks to run only in installed builds where Expo Updates is enabled, so that Metro/dev behavior stays predictable.
14. As a developer, I want development builds to avoid automatic OTA reloads while coding, so that local testing is not interrupted.
15. As a release operator, I want preview builds to receive auto-updates from the preview channel, so that internal rollout testing is fast.
16. As a release operator, I want production auto-update behavior to be explicitly configurable, so that the business can choose when production devices should auto-restart.
17. As a release operator, I want the app version/runtime/update id diagnostics to stay available in Settings, so that support can confirm what a device is running.
18. As a release operator, I want update config values to live in app config/env, so that behavior can be changed per build profile without code edits.
19. As a sales rep, I want update restarts not to discard an unsaved invoice or quote, so that automatic updates do not cause data loss.
20. As an installer, I want update restarts not to interrupt a job submission at the moment it is being sent, so that my work is not duplicated or lost.
21. As a dispatcher or driver, I want update restarts not to interrupt dispatch or warehouse completion actions while they are submitting, so that status changes remain reliable.
22. As a support/admin user, I want the manual App Updates screen to keep Check, Download, and Restart actions, so that I can recover if auto-update did not run.
23. As a support/admin user, I want update diagnostics to show channel, runtime, embedded/running source, update id, created time, and `UPDATE_VERSION`, so that device support has concrete evidence.
24. As a developer, I want launch-update phase helpers covered by focused tests, so that modal visibility, progress, and step state do not regress.
25. As a developer, I want foreground cooldown/config parsing covered by focused tests, so that environment-driven behavior is stable.
26. As a developer, I want the update hook to guard against concurrent checks, so that launch and foreground events cannot start multiple downloads.
27. As a developer, I want Expo Updates calls isolated behind one hook/helper boundary, so that future rollout changes do not scatter update logic across screens.
28. As a developer, I want the auto-update modal mounted once near the app root, so that it works regardless of the current route.
29. As a developer, I want the manual update screen to reuse the same user-facing concepts, so that automatic and manual update behavior stay consistent.
30. As a developer, I want published OTA version bumps to keep using the existing `UPDATE_VERSION` workflow, so that releases remain traceable.
31. As a QA tester, I want to verify the feature in an installed preview build, so that behavior is tested in the environment where Expo Updates is enabled.
32. As a QA tester, I want to verify no auto-update behavior in Metro/dev mode, so that local development remains stable.
33. As a QA tester, I want to verify no-update, update-available, rollback, download-failure, and reload-failure states, so that the major Expo Updates branches are covered.

## Implementation Decisions

- Use Expo Updates as the update mechanism. Do not introduce a separate native updater, app-store updater, or custom binary download path.
- Treat the local `al-ghurobaa` implementation as the behavioral reference: installed non-dev builds check on launch, optionally check on foreground with cooldown, download available updates, show a full-screen modal, then call `reloadAsync`.
- Keep `updates.checkAutomatically: "NEVER"` in native Expo config so the app owns the update UX instead of letting Expo perform automatic checks without GND-specific UI.
- Continue using `runtimeVersion.policy = "appVersion"` so OTA updates only apply to compatible installed runtime versions.
- Preserve the existing `UPDATE_VERSION` value in Expo config and existing OTA publish script flow for traceable update messages.
- Add or align app config extras for foreground behavior:
  - `autoUpdateOnForeground`
  - `autoUpdateForegroundCooldownMs`
- Allow environment overrides for foreground behavior, matching the al-ghurobaa pattern:
  - `EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND`
  - `EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS`
- Parse boolean config values defensively, accepting `false`, `0`, `off`, and `no` as disabled values.
- Parse cooldown config defensively and fall back to 5 minutes when the value is missing or invalid.
- Guard the hook against concurrent checks using an internal checking ref.
- Track the last update check time so foreground checks respect the cooldown.
- Run a forced check once on launch when the build is eligible.
- Subscribe to app-state changes and run a cooldown-gated check when the app returns from background or inactive to active.
- Keep the update modal hidden during the `checking` phase so users only see blocking UI when an update is actually being downloaded or applied.
- Show the modal for `downloading`, `updating`, `restarting`, and `failed` phases.
- Use the same visible step model as the reference app: Downloading, Updating, Restarting.
- Use real `Updates.useUpdates().downloadProgress` during download, with a small minimum progress fill so the screen does not look frozen.
- Use deterministic progress values for applying and restarting phases because Expo does not expose granular progress for those phases.
- On check failure, log a warning and return to idle without showing the modal.
- On fetch/reload failure, show a failed modal with a readable error and a Continue action.
- Keep Settings > App Updates as the manual update and diagnostics surface.
- Do not remove manual Check, Download, or Restart controls.
- Mount the auto-update modal near the root layout, once, outside feature-specific screens.
- Decide the GND-specific critical-workflow restart rule before implementation finishes. Acceptable options are:
  - follow al-ghurobaa exactly and restart immediately after download, relying on existing local recovery/autosave where present;
  - defer reload when a known critical workflow reports dirty/saving state, then restart once the workflow is safe;
  - show a required restart prompt after download only when a critical workflow is active.
- If a critical-workflow deferral is added, keep the Expo update download automatic but make reload timing explicit and testable.
- Do not change web app deployment behavior, APK download behavior, EAS project ownership, auth/session contracts, sales/job APIs, or database schema.

## Testing Decisions

- Primary testing seam: the launch auto-update helper/hook boundary that decides whether to check, when to show the modal, how phases map to progress/steps, how foreground cooldown works, and how failures recover.
- Secondary testing seam: the root mounted modal behavior, verifying that the modal is hidden while checking and visible for download/apply/restart/failure phases.
- Manual update screen tests should cover external behavior only: Check, Download, Restart button eligibility, status copy, error copy, progress display, and diagnostics fields.
- If critical-workflow deferral is implemented, test the workflow signal as a public guard contract, not the internals of any sales or jobs screen.
- Mock Expo Updates APIs in tests. Do not depend on real EAS network calls for unit coverage.
- Tests should assert that development mode and disabled `Updates.isEnabled` skip auto-checking.
- Tests should assert that launch checks run once and foreground checks are cooldown-gated.
- Tests should assert that concurrent launch/foreground triggers do not produce duplicate `checkForUpdateAsync` or `fetchUpdateAsync` calls.
- Tests should assert that `isAvailable` and `isRollBackToEmbedded` both lead to the download/apply path.
- Tests should assert that no-update results return to idle without opening the modal.
- Tests should assert that check failures are silent and fetch/reload failures produce the dismissible failed state.
- Existing prior art in GND includes `apps/expo-app/src/lib/launch-auto-update.test.ts`, the current `use-launch-auto-update` hook, `app-auto-update-modal`, and `updates-screen`.
- Reference prior art in al-ghurobaa includes its `use-launch-auto-update` AppState subscription, config/env parsing helpers, `AppAutoUpdateModal`, and Settings > App Updates screen.
- Manual QA must use an installed preview build. Metro/dev-client reload does not prove Expo Updates production behavior.
- Manual QA should publish a preview OTA update, open an older installed preview APK, observe automatic download/restart, then confirm the update id/version diagnostics changed after reload.
- Manual QA should background and foreground the app after the cooldown with a new update available, then verify the foreground update path.
- Manual QA should confirm development builds and local Metro sessions do not auto-check or auto-reload.
- Manual QA should cover an active mobile invoice/quote, job, dispatch, or warehouse flow if the implementation includes a critical-workflow deferral rule.

## Out of Scope

- Native binary app update prompts through Play Store or App Store.
- Downloading APKs from the web support page.
- Changing EAS project id, owner, channels, or build profiles unless required by a separate release task.
- Changing runtime version policy.
- Database schema, API contracts, auth permissions, or sales/job persistence behavior.
- Replacing Settings > App Updates.
- Adding push notifications for available updates.
- Forcing updates across incompatible runtime versions.
- Building a web auto-update system for `apps/www`.
- Publishing the spec to GitHub or any external issue tracker.

## Further Notes

- GND already has a partial auto-update foundation: Expo Updates dependency, `UPDATE_VERSION`, preview OTA publish script, root-mounted `AppAutoUpdateModal`, Settings > App Updates, and launch-only helper coverage.
- The main parity gap with the local al-ghurobaa implementation is foreground checking with cooldown/config parsing and the broader installed-build auto-update behavior.
- GND currently documents preview-only launch auto-update behavior in `brain/features/mobile-build-variants.md`; implementation should update that feature file when behavior changes.
- Auto-restart is more sensitive in GND than al-ghurobaa because users may be entering invoices, quotes, job records, or dispatch/warehouse status. The implementation should explicitly record whether it mirrors immediate restart exactly or adds a GND-specific deferral guard.
