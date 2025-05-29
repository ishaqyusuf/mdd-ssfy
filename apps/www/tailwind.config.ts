import baseConfig from "@gnd/ui/tailwind.config";
import type { Config } from "tailwindcss";

export default {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "../../packages/ui/src/**/*.{ts,tsx}",
    ],
    presets: [baseConfig],
    plugins: [],
} satisfies Config;
