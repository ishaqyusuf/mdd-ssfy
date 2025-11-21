import type { Config } from "tailwindcss";
import baseConfig from "@gnd/ui/tailwind.config";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  // presets: [require("nativewind/preset")],
  presets: [require("nativewind/preset"), baseConfig],
} satisfies Config;
