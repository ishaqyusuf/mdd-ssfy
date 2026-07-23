# Mobile Build Variants

## Purpose
Tracks Expo/EAS build-variant behavior for the GND mobile app.

## Current Behavior
- `apps/expo-app/eas.json` sets `APP_VARIANT=development` for the EAS development profile and `APP_VARIANT=preview` for the preview profile.
- Development builds use the dev-branded name, scheme, launcher icon, adaptive icon, iOS icons, and splash assets.
- Development builds install as `com.gnd.prodesk.dev` on Android and `com.gnd.prodesk.dev` on iOS so they can live beside preview builds.
- Preview and production-style builds keep the canonical install identity `com.gnd.prodesk`.
- Preview builds continue to use the standard GND Millwork launcher and splash branding.
- Expo updates are app-owned with `updates.checkAutomatically: "NEVER"` and `runtimeVersion.policy = "appVersion"`; GND controls automatic checks through the root-mounted update modal instead of Expo's native automatic check UI.
- Launch-time auto-update checks are enabled only for installed preview builds where `extra.appVariant === "preview"` and `expo-updates` is enabled. Development and production builds keep updates manual-only.
- Preview installed builds also check for OTA updates when the app returns to the foreground. Foreground checks are enabled by default, are cooldown-gated for 5 minutes, and can be overridden with `EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND` and `EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS`.
- Mobile quick login, login credential prefills, and `Debug` wrappers are
  `__DEV__`-only. Preview and production builds render none of those controls.
- The development-only mobile quick-login picker calls
  `hrm.getQuickLoginEmployees`, whose API response is intentionally always
  `[]`; it does not fetch from the shared employee list.
- Preview build and OTA update commands remove `EXPO_PUBLIC_EMAIL` and
  `EXPO_PUBLIC_TOK` after loading the production environment and set
  `EXPO_NO_DOTENV=1` so Expo cannot reload those development credentials from
  local dotenv files. App config rejects an explicitly preview/production
  variant if either credential remains set.
- Settings > App Updates is the manual update surface for all installed builds, showing OTA status, check/download/restart actions, and build diagnostics including channel, runtime, running source, update id, created time, and `UPDATE_VERSION`.
- Support > Mobile App opens a download-only web support page whose only action is the `/api/download-app` APK download button; the former Super Admin Settings > App Download page has been removed while the download endpoint remains live.
- Android edge-to-edge is disabled in native config because the Expo/RN Android edge-to-edge container was crashing during mobile invoice customer selection with `EdgeToEdgeReactViewGroup contains null child`. This requires a fresh Android EAS/dev build to take effect; OTA updates and Metro reloads cannot change the installed native container.

## Key Files
- `apps/expo-app/app.config.ts`
- `apps/expo-app/eas.json`
- `apps/expo-app/src/hooks/use-launch-auto-update.ts`
- `apps/expo-app/src/lib/launch-auto-update.ts`
- `apps/expo-app/src/components/app-auto-update-modal.tsx`
- `apps/expo-app/src/screens/updates-screen.tsx`
- `apps/expo-app/src/lib/launch-auto-update.test.ts`
- `apps/expo-app/src/lib/preview-build-security.test.ts`
- `apps/expo-app/scripts/update-preview.mjs`
- `apps/expo-app/assets/icons/*`
- `apps/www/src/components/settings/app-download-support-page.tsx`
