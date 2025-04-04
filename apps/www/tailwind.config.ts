import baseConfig from "@gnd/ui/tailwind.config";
import type { Config } from "tailwindcss";

export default {
  content: [
    "./**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}", 
  ],
  presets: [baseConfig],
  plugins: [ ],
} satisfies Config;
