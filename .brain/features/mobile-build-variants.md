# Mobile Build Variants

## Purpose
Tracks Expo/EAS build-variant behavior for the GND mobile app.

## Current Behavior
- `apps/mobile/eas.json` sets explicit development, preview, and production variants; preview builds bind to the `preview` update channel and production builds bind to `production`.
- Root EAS commands are flag-based: `eas:build` requires `--dev`, `--preview`, or `--prod`, while `eas:update` requires `--preview` or `--prod`.
- Development builds use the dev-branded name, scheme, launcher icon, adaptive icon, iOS icons, and splash assets.
- Development builds install as `com.gnd.prodesk.dev` on Android and `com.gnd.prodesk.dev` on iOS so they can live beside preview builds.
- Preview and production-style builds keep the canonical install identity `com.gnd.prodesk`.
- Preview builds continue to use the standard GND Millwork launcher and splash branding.
- Expo updates are app-owned with `updates.checkAutomatically: "NEVER"` and `runtimeVersion.policy = "appVersion"`; GND controls automatic checks through the root-mounted update modal instead of Expo's native automatic check UI.
- Launch-time auto-update checks are enabled only for installed preview builds where `extra.appVariant === "preview"` and `expo-updates` is enabled. Development and production builds keep updates manual-only.
- Preview installed builds also check for OTA updates when the app returns to the foreground. Foreground checks are enabled by default, are cooldown-gated for 5 minutes, and can be overridden with `EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND` and `EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS`.
- Mobile quick login requires both the Expo `__DEV__` runtime and the embedded
  `extra.appVariant === "development"` build identity. This prevents preview
  builds from rendering or mounting the quick-login employee query even if the
  runtime reports development semantics. Login credential prefills and `Debug`
  wrappers remain `__DEV__`-only; preview and production release commands strip
  the development credentials.
- Selecting a development quick-login employee fills both login form fields:
  the selected employee email and the current `EXPO_PUBLIC_TOK`, exposed to the
  development client through scoped Expo config. The picker does not
  auto-submit; the developer still explicitly presses Sign in. Both login
  templates consume the same credential-selection contract.
- The development-only mobile quick-login picker calls
  `hrm.getQuickLoginEmployees`, whose API response is intentionally always
  `[]`; it does not fetch from the shared employee list.
- Preview and production build/OTA commands remove `EXPO_PUBLIC_EMAIL` and
  `EXPO_PUBLIC_TOK` after loading the production environment and set
  `EXPO_NO_DOTENV=1` so Expo cannot reload those development credentials from
  local dotenv files. App config rejects an explicitly preview/production
  variant if either credential remains set.
- Development builds, preview builds, and preview OTA updates also force Sentry
  telemetry/debug/smoke flags off and set `SENTRY_DISABLE_AUTO_UPLOAD=true`.
  This keeps non-production releases silent and prevents source/debug artifact
  uploads even when an environment wrapper contains production Sentry values.
- Settings > App Updates is the manual update surface for all installed builds, showing OTA status, check/download/restart actions, and build diagnostics including channel, runtime, running source, update id, created time, and `UPDATE_VERSION`.
- Production OTA publishing targets the `production` channel/environment and retains production Sentry configuration; production automatic checks remain disabled.
- Both mobile sign-in designs and the signed-in Settings footer include an
  accessible Privacy Policy link backed
  by `extra.privacyPolicyUrl`. App config accepts only an HTTPS value from
  `EXPO_PUBLIC_PRIVACY_POLICY_URL` when supplied; the link is hidden while the
  owner/legal-approved URL is absent. The iOS release-readiness check fails on
  that missing production URL so a signed store build is not treated as a
  privacy-complete public-submission binary. The EAS production environment
  must contain the approved URL before the final build; a local sample URL
  check proves only wiring.
- The public release currently authenticates existing active GND company
  accounts, not arbitrary new users. The unfinished `/sign-up` route and
  driver-app alias were removed so the production binary does not expose a
  one-word placeholder. Public self-registration requires a separately
  approved account, tenancy, privacy, and deletion design; this removal does
  not change company-account sign-in.
- The iOS production build and combined build/upload package scripts run
  `ios:release:preflight` under `with-env:prod` before calling EAS. A missing
  policy URL stops build queueing; Android and preview scripts are unchanged.
- The iOS preflight explicitly evaluates `APP_VARIANT=production` and reports
  only non-secret booleans for Sentry/Logly enablement and HTTPS configuration.
  It now also checks that the configured API/auth base is a public HTTPS root
  origin. Installed preview/production clients select their embedded
  `extra.appVariant` before any public variant env flag and route both tRPC
  and Better Auth through `EXPO_PUBLIC_BASE_URL`; development keeps its
  debugger-host routing. The production iOS config guard rejects a missing,
  local, or non-HTTPS base before EAS build queueing. The URL check is
  structural; installed-build login and backend reachability remain required.
  Bun 1.3.0 reloads mobile `.env*` values when launched from the app root even
  after `env -u`, so the preflight uses a Node wrapper that strips development
  login keys and launches the Bun checker from a neutral temp-directory cwd.
  The final EAS command retains the existing credential stripping and
  `EXPO_NO_DOTENV=1`; no secret file is edited.
  The iOS-specific production-profile `ios.env` flag makes Expo config reject
  Sentry debug/smoke-test modes and enabled Sentry/Logly without an HTTPS
  DSN/endpoint. Android production does not receive this flag, preserving its
  existing route. The iOS guard also runs in EAS's production build
  environment, which may differ from the local snapshot; it does not establish
  vendor retention, tracking, or final App Privacy answers.
- Both root iOS submit aliases require an explicit reviewed EAS build UUID.
  The account runner rejects absent/malformed IDs and `--latest` before EAS
  account authentication. Both direct mobile-package submit aliases now run
  the same reviewed-ID-only adapter, which rejects missing/duplicate/invalid
  IDs, alternate selectors, and known retired public candidates before EAS
  runs. No direct script may open EAS's interactive build selector. The
  combined build/upload command still needs separate confirmation for both
  external actions.
- The combined iOS build/automatic-upload root route rejects missing
  `--acknowledge-build` or `--acknowledge-auto-upload` before EAS login, and
  the direct mobile-package script rejects missing corresponding guard values
  before preflight. These are accident guards, not permission to queue or
  upload without action-time owner approval. The first public release should
  use build → inspect IPA → upload by reviewed UUID instead.
  The account runner also rejects `--platform android` on its submit and
  combined routes instead of silently invoking iOS operations; ordinary
  Android build/update routing remains unchanged.
- Support > Mobile App opens a download-only web support page whose only action is the `/api/download-app` APK download button; the former Super Admin Settings > App Download page has been removed while the download endpoint remains live.
- Android edge-to-edge is disabled in native config because the Expo/RN Android edge-to-edge container was crashing during mobile invoice customer selection with `EdgeToEdgeReactViewGroup contains null child`. This requires a fresh Android EAS/dev build to take effect; OTA updates and Metro reloads cannot change the installed native container.
- Metro singleton resolution keeps bare imports pinned to the app-owned package,
  honors package export-map subpaths that Node can resolve, and delegates
  unresolved deep subpaths back to Metro from that same package root. This
  preserves NativeWind's React Native aliases while allowing TypeScript-only
  internals such as Keyboard Controller's `react-native-reanimated/src/core`
  dependency to resolve under the Node-hosted Expo launcher.
- SDK 54 release dependencies are pinned to Expo's compatible patch set for
  `expo`, `expo-constants`, `expo-file-system`, `expo-updates`, and NetInfo.
  Root React overrides remain available to the Next.js apps, while Metro tests
  enforce the mobile-only React/React DOM 19.1 aliases. Expo dependency
  validation excludes only those three intentionally overridden packages.
- `experiments.autolinkingModuleResolution` is enabled so Metro resolves native
  modules to the same installations selected by Expo Autolinking. This is the
  SDK 54 workaround for unavoidable duplicate peer installations under Bun's
  isolated monorepo layout; keep the release-readiness and Metro resolution
  tests green when changing dependencies.
- Mobile-imported validation contracts must not transitively load Node-only
  implementations. Sales completion filter schemas live in
  `sales-completion-filter.ts`, separate from the server implementation's
  `node:crypto` use; a production-mode iOS Metro export validates this boundary.

## Key Files
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/metro.config.js`
- `apps/mobile/metro.config.test.js`
- `apps/mobile/src/hooks/use-launch-auto-update.ts`
- `apps/mobile/src/lib/launch-auto-update.ts`
- `apps/mobile/src/components/app-auto-update-modal.tsx`
- `apps/mobile/src/screens/updates-screen.tsx`
- `apps/mobile/src/lib/launch-auto-update.test.ts`
- `apps/mobile/src/lib/preview-build-security.test.ts`
- `apps/mobile/src/lib/release-base-url.ts`
- `apps/mobile/scripts/run-ios-release-preflight.cjs`
- `apps/mobile/src/components/privacy-policy-link.tsx`
- `apps/mobile/scripts/eas-update.mjs`
- `apps/mobile/assets/icons/*`
- `apps/dashboard/src/components/settings/app-download-support-page.tsx`

## iOS store production path (2026-09-12; public target since 2026-09-15)

- Production iOS builds use `distribution: "store"`; preview stays
  `distribution: "internal"` and is never used for the public App Store release.
- Root commands are `bun run eas:build:ios`,
  `bun run eas:submit:ios --id <reviewed-EAS-build-id>`, and
  `bun run eas:build-submit:ios`. Existing Android `eas:build` routing and
  mobile Android scripts are unchanged.
- `bun run eas:auth` switches to the configured EAS account and verifies it with
  `eas whoami` without starting a release or update operation.
- Submission targets Apple team `ZXC78SPCV4`. The EAS owner/project/update
  linkage remains `pcruz321` / `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`.
- The production submit profile pins verified App Store Connect app ID
  `6811442922` for `GND Millwork` / `com.gnd.prodesk`.
- `ITSAppUsesNonExemptEncryption` is `false` based on the audited absence of
  app-owned custom cryptography. Re-audit if custom crypto is added.
- `bun run ios:release:check` enforces the release configuration invariants.
- The current gated release procedure is in
  `.brain/runbooks/ios-public-app-store-distribution.md`; the TestFlight
  runbook is historical.
