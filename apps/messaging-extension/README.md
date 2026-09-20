# GND Marketplace extension

WXT/React Manifest V3 workspace for the sales manager's browser. This first ticket only displays an unpaired connection shell. It does not collect Facebook data, connect to GND, generate suggestions or send messages.

Run the package-scoped `dev` script for development and load the generated Chromium output as an unpacked extension in `chrome://extensions` (Developer mode → Load unpacked). The package scripts `build` and `zip` generate the distributable artifact in the release ticket.

Entry points: `entrypoints/background.ts` (inert worker), `inbox.content.ts` (isolated, inert source placeholder), `popup/`, `sidepanel/`, and `options/`. Shared browser-safe contracts are in `@gnd/messaging`. Extension UI styles load only from HTML entrypoints and are not injected into Facebook pages.

Permissions are deliberately limited: `storage` is reserved for future scoped pairing, and `sidePanel` provides the manager UI. The inert content script is declared statically only for Facebook messages/Marketplace paths (so Chrome may show those site-access permissions at install). The business host is optional for a later explicit grant; no script is injected there in this ticket. No `<all_urls>`, cookies, debugger, native messaging, database secrets or remote executable code.

WXT `0.21.4`, React module `1.2.2`, React from the root catalog and the local `@gnd/ui/button` are pinned by package/workspace conventions. Before distribution, choose and persist a stable extension identity through the approved Chrome Web Store or enterprise channel; unpacked development IDs may vary with install path. Pairing origins will depend on that identity in GME-01-02.
