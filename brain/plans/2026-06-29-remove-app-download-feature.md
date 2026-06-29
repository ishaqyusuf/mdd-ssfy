# Remove App Download Settings Page

## Goal
Remove only the Super Admin app-download settings page from `apps/www`.

Keep the download infrastructure intact: `/api/download-app`, Support > Mobile App, the support download page, the app-download settings contract, and expiry reminder plumbing are still used for downloading and link maintenance.

## Implementation Path
1. Remove the settings page route and UI:
   - Delete `apps/www/src/app/(sidebar)/settings/app-download/page.tsx`.
   - Delete `apps/www/src/components/settings/app-download-settings-page.tsx`.

2. Remove Settings navigation only:
   - Remove the `Settings > App Download` link from `apps/www/src/components/sidebar-links.ts`.
   - Keep `Support > Mobile App` pointing at `/support/mobile-app`.

3. Update feature docs:
   - Update `brain/features/mobile-build-variants.md` so it says the Support > Mobile App download page remains, while the Super Admin Settings > App Download page has been removed.
   - Keep `brain/api/endpoints.md` unchanged because `/api/download-app` remains live.
   - Add a progress entry after validation.

## Validation
- `rg -n "\"/settings/app-download\"|'\\/settings\\/app-download'|settings/app-download/page|AppDownloadSettingsPage|app-download-settings-page" apps/www/src -S`
- `rg -n "support/mobile-app|href=\"/api/download-app\"|AppDownloadSupportPage" apps/www/src -S`
- `bunx biome check apps/www/src/components/sidebar-links.ts`
- `bun run --filter @gnd/www typecheck`

## Notes
- This is not an app-download feature removal. It is a settings-page removal.
- Keep `/api/download-app` and `/support/mobile-app` live.
- Do not remove `app-download-apk` settings schema, tRPC procedures, reminder jobs, or email templates unless a follow-up task explicitly removes the underlying configurable download infrastructure.
