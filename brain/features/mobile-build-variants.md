# Mobile Build Variants

## Purpose
Tracks Expo/EAS build-variant behavior for the GND mobile app.

## Current Behavior
- `apps/expo-app/eas.json` sets `APP_VARIANT=development` for the EAS development profile and `APP_VARIANT=preview` for the preview profile.
- Development builds use the dev-branded name, scheme, launcher icon, adaptive icon, iOS icons, and splash assets.
- Development builds install as `com.gnd.prodesk.dev` on Android and `com.gnd.prodesk.dev` on iOS so they can live beside preview builds.
- Preview and production-style builds keep the canonical install identity `com.gnd.prodesk`.
- Preview builds continue to use the standard GND Millwork launcher and splash branding.
- Expo updates are app-owned with `updates.checkAutomatically: "NEVER"` and `runtimeVersion.policy = "appVersion"`; installed apps do not let Expo automatically check on launch.
- Launch-time auto-update checks are enabled only for installed preview builds where `extra.appVariant === "preview"` and `expo-updates` is enabled. Development and production builds keep updates manual-only.
- Settings > App Updates is the manual update surface for all installed builds, showing OTA status, check/download/restart actions, and build diagnostics including channel, runtime, running source, update id, created time, and `UPDATE_VERSION`.
- Android edge-to-edge is disabled in native config because the Expo/RN Android edge-to-edge container was crashing during mobile invoice customer selection with `EdgeToEdgeReactViewGroup contains null child`. This requires a fresh Android EAS/dev build to take effect; OTA updates and Metro reloads cannot change the installed native container.

## Key Files
- `apps/expo-app/app.config.ts`
- `apps/expo-app/eas.json`
- `apps/expo-app/src/hooks/use-launch-auto-update.ts`
- `apps/expo-app/src/lib/launch-auto-update.ts`
- `apps/expo-app/src/components/app-auto-update-modal.tsx`
- `apps/expo-app/src/screens/updates-screen.tsx`
- `apps/expo-app/assets/icons/*`
