// const { hairlineWidth, platformSelect } = require('nativewind/theme');
import type { Config } from "tailwindcss";
/** @type {import('tailwindcss').Config} */
export default {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    // "./components/**/*.{js,jsx,ts,tsx}",
    "./*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  // corePlugins: {
  //   backgroundOpacity: true,
  // },
  // presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        // 'custom-color': 'var(--custom-color) / <alpha-value>)',
        // customColor: withOpacity('custom-color'),
        "custom-color": withOpacity("custom-color"),
        "custom-color2": withOpacity("custom-color2"),
        // destructive: withOpacity('destructive'),
        destructive2: withOpacity("destructive2"),
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // colors: {
      //   border: withOpacity('border'),
      //   input: withOpacity('input'),
      //   ring: withOpacity('ring'),
      //   background: withOpacity('background'),
      //   foreground: withOpacity('foreground'),
      //   primary: {
      //     DEFAULT: withOpacity('primary'),
      //     foreground: withOpacity('primary-foreground'),
      //   },
      //   secondary: {
      //     DEFAULT: withOpacity('secondary'),
      //     foreground: withOpacity('secondary-foreground'),
      //   },
      //   destructive: {
      //     DEFAULT: withOpacity('destructive'),
      //     foreground: withOpacity('destructive-foreground'),
      //   },
      //   muted: {
      //     DEFAULT: withOpacity('muted'),
      //     foreground: withOpacity('muted-foreground'),
      //   },
      //   accent: {
      //     DEFAULT: withOpacity('accent'),
      //     foreground: withOpacity('accent-foreground'),
      //   },
      //   popover: {
      //     DEFAULT: withOpacity('popover'),
      //     foreground: withOpacity('popover-foreground'),
      //   },
      //   card: {
      //     DEFAULT: withOpacity('card'),
      //     foreground: withOpacity('card-foreground'),
      //   },
      // },

      borderWidth: {
        // hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
} satisfies Config;

function withOpacity(variableName) {
  // 'custom-color': 'rgb(var(--custom-color) / <alpha-value>)',
  return `rgb(var(--${variableName}) / <alpha-value>)`;
  // return `rgb(var(--${variableName}) / <alpha-value>)`;
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) return `rgb(var(--${variableName}))`;
    return `rgb(var(--android-${variableName}) / ${opacityValue})`;
  };
  // return ({ opacityValue }) => {
  //   return `rgb(var(--${variableName}))`;
  // };
  //   if (opacityValue !== undefined) {
  //     return platformSelect({
  //       ios: `rgb(var(--${variableName}) / ${opacityValue})`,
  //       android: `rgb(var(--android-${variableName}) / ${opacityValue})`,
  //     });
  //   }
  //   return platformSelect({
  //     ios: `rgb(var(--${variableName}))`,
  //     android: `rgb(var(--android-${variableName}))`,
  //   });
  // };
}
