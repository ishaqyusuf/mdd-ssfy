import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  manifest: {
    name: "GND Marketplace",
    description: "Connect a sales manager's browser to the GND Marketplace inbox.",
    version: "0.1.0",
    permissions: ["storage", "sidePanel"],
    // Additional business surfaces require an explicit grant in a later ticket.
    optional_host_permissions: ["https://business.facebook.com/*"],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
