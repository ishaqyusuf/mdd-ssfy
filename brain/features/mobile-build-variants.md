# Mobile Build Variants

## Purpose
Tracks Expo/EAS build-variant behavior for the GND mobile app.

## Current Behavior
- `apps/expo-app/eas.json` sets `APP_VARIANT=development` for the EAS development profile and `APP_VARIANT=preview` for the preview profile.
- Development builds use the dev-branded name, scheme, launcher icon, adaptive icon, iOS icons, and splash assets.
- Development builds install as `com.gnd.prodesk.dev` on Android and `com.gnd.prodesk.dev` on iOS so they can live beside preview builds.
- Preview and production-style builds keep the canonical install identity `com.gnd.prodesk`.
- Preview builds continue to use the standard GND Millwork launcher and splash branding.

## Key Files
- `apps/expo-app/app.config.ts`
- `apps/expo-app/eas.json`
- `apps/expo-app/assets/icons/*`
