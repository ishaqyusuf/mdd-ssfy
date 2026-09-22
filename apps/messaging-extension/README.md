# GND Marketplace extension

WXT/React Manifest V3 workspace for the sales manager's browser. The connection screen accepts a one-time code generated in dashboard `/settings/marketplace`; it does not collect Facebook data, generate suggestions or send messages yet.

Before building for a non-local dashboard, set `WXT_PUBLIC_GND_APP_ORIGIN` to the exact HTTPS dashboard origin. The server must set `MESSAGING_EXTENSION_ORIGIN` to the installed stable `chrome-extension://<id>` origin, `NEXT_PUBLIC_APP_URL` to that dashboard origin, and configure its shared redemption limiter. Unpacked extension IDs may change; do not distribute a build using the default `http://localhost:3010` origin. The dashboard currently requires an existing enabled MessagingConnection and a Super Admin with a password account; Google-only users cannot issue a code yet. Chrome requests only that dashboard host at the Connect click. The extension deliberately uses whichever Facebook session is open in the Chrome profile and does not verify the Facebook profile identity. This is not a live-pairing acceptance report.

Run the package-scoped `dev` script for development and load the generated Chromium output as an unpacked extension in `chrome://extensions` (Developer mode → Load unpacked). The package scripts `build` and `zip` generate the distributable artifact in the release ticket.

Entry points: `entrypoints/background.ts` (connection/status only; no scans or sends), `inbox.content.ts` (isolated, inert source placeholder), `popup/`, `sidepanel/`, and `options/`. Shared browser-safe contracts are in `@gnd/messaging`. Extension UI styles load only from HTML entrypoints and are not injected into Facebook pages.

Permissions are deliberately limited: `storage` is reserved for future scoped pairing, and `sidePanel` provides the manager UI. The inert content script is declared statically only for Facebook messages/Marketplace paths (so Chrome may show those site-access permissions at install). The business host is optional for a later explicit grant; no script is injected there in this ticket. No `<all_urls>`, cookies, debugger, native messaging, database secrets or remote executable code.

WXT `0.21.4`, React module `1.2.2`, React from the root catalog and the local `@gnd/ui/button` are pinned by package/workspace conventions. Before distribution, choose and persist a stable extension identity through the approved Chrome Web Store or enterprise channel; unpacked development IDs may vary with install path. Pairing origins will depend on that identity in GME-01-02.
