# Mobile Theme Persistence

## Purpose

Tracks the Expo app contract for preserving the user's System, Light, or Dark
theme preference across cold starts, JavaScript reloads, and Expo OTA updates.

## Current Architecture

- `gnd_theme_override` remains the canonical AsyncStorage key and accepts
  `system`, `light`, or `dark`.
- The app-owned theme runtime is the React-observable source of the selected
  override. Explicit Light and Dark always win over device appearance; System
  follows the current device appearance.
- `applyThemeOverride` synchronizes React Native `Appearance` with the app
  runtime. React consumers subscribe through `useSyncExternalStore`, so an
  explicit override does not depend on a native appearance-change event after a
  cold start or OTA reload.
- The root layout reads and applies the stored override before mounting theme
  consumers or hiding the splash screen. Storage failures fall back to System.
- The resolved theme supplies React Navigation, status-bar behavior, direct
  theme-token consumers, and NativeWind semantic variables from one palette.

## Validation

- Focused runtime coverage proves explicit override precedence, immediate
  subscriber notification after reload, duplicate-update suppression, and
  System/device resolution.
- Focused NativeWind coverage proves semantic variables map to the matching
  light and dark GND palettes.
- The existing launch auto-update helper suite remains part of the regression
  gate.
- The broad Expo TypeScript run retains unrelated baseline diagnostics; its
  filtered output contains no diagnostics in the touched theme implementation
  files.
- Android native build and installation completed successfully on the
  `Pixel_3a_API_34` emulator. Full visual reload proof is currently blocked
  before app mount by the pre-existing Metro incompatibility where
  `jsonwebtoken/sign.js` imports Node's `crypto` module.

## References

- Canonical implementation:
  `/Users/M1PRO/Documents/code/ewatrade/apps/mobile/src/lib/theme-runtime.ts`
- Canonical root hydration:
  `/Users/M1PRO/Documents/code/ewatrade/apps/mobile/src/app/_layout.tsx`
