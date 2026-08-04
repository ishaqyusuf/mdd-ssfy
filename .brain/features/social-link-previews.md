# Social Link Previews

## Purpose

Keep shared GND workspace links recognizable and descriptive in clients that
read Open Graph or Twitter card metadata.

## Current Behavior

- The dashboard serves a branded 1200×630 PNG from `/opengraph-image`.
- Shared metadata uses that application-owned image instead of the retired
  `assets.gndprodesk.com/thumbnail.png` deployment.
- The root dashboard description accurately names quotes, sales, production,
  inventory, and customer workflows as the connected workspace scope.
- Route-specific titles and descriptions continue to flow through the existing
  `constructMetadata` helpers while inheriting the working large-image preview.

## Validation

- Validate the dashboard build and TypeScript boundary.
- Verify `/opengraph-image` returns a 1200×630 PNG and shared page HTML contains
  the expected Open Graph description/image and Twitter large-image metadata.

The image composition uses fixed documented GND brand colors because Next.js
`ImageResponse` renders outside the application CSS/theme-variable runtime.
