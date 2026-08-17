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
- Support > Mobile App opens a download-only web support page whose only action is the `/api/download-app` APK download button; the former Super Admin Settings > App Download page has been removed while the download endpoint remains live.
- Android edge-to-edge is disabled in native config because the Expo/RN Android edge-to-edge container was crashing during mobile invoice customer selection with `EdgeToEdgeReactViewGroup contains null child`. This requires a fresh Android EAS/dev build to take effect; OTA updates and Metro reloads cannot change the installed native container.
- Metro singleton resolution keeps bare imports pinned to the app-owned package,
  honors package export-map subpaths that Node can resolve, and delegates
  unresolved deep subpaths back to Metro from that same package root. This
  preserves NativeWind's React Native aliases while allowing TypeScript-only
  internals such as Keyboard Controller's `react-native-reanimated/src/core`
  dependency to resolve under the Node-hosted Expo launcher.

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
- `apps/mobile/scripts/eas-update.mjs`
- `apps/mobile/assets/icons/*`
- `apps/dashboard/src/components/settings/app-download-support-page.tsx`
