// type StyleType = keyof typeof tw;

import { Font } from "@react-pdf/renderer";

// const tw = {
//   // Typography
//   "text-sm": { fontSize: 12 },
//   "font-mono": {
//     fontFamily:
//       'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
//   },

//   // Layout
//   flex: { display: "flex", flexDirection: "row" },
//   "flex-col": { display: "flex", flexDirection: "column" },
//   "gap-4": { gap: 16 },
//   grid: { display: "flex", flexWrap: "wrap", flexDirection: "row" }, // mimic grid
//   "grid-cols-4": { width: "100%" },
//   "col-span-3": { flexGrow: 0, flexShrink: 0, flexBasis: "75%" },

//   // Padding
//   "p-2": { padding: 8 },
//   "px-4": { paddingLeft: 16, paddingRight: 16 },
//   "py-2": { paddingTop: 8, paddingBottom: 8 },

//   // Border
//   border: {
//     borderWidth: 1,
//     borderColor: "#000000",
//     borderStyle: "solid",
//   },
//   "border-red-400": {
//     borderColor: "#f87171",
//   },

//   // Widths
//   "w-1/2": { width: "50%" },
//   "w-2/3": { width: "66.666667%" },
// } as const;
type StyleType = keyof typeof tw;
const CDN_URL = "https://cdn.midday.ai";

// Font.register({
//   family: "GeistMono",
//   fonts: [
//     {
//       src: `${CDN_URL}/fonts/GeistMono/ttf/GeistMono-Regular.ttf`,
//       fontWeight: 400,
//     },
//     {
//       src: `${CDN_URL}/fonts/GeistMono/ttf/GeistMono-Medium.ttf`,
//       fontWeight: 500,
//     },
//   ],
// });
const tw = {
  // Typography
  "text-sm": { fontSize: 12 },
  "text-xl": { fontSize: 18 },
  "text-2xl": { fontSize: 24 },
  "text-5xl": { fontSize: 40 },
  "font-mono": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  uppercase: { textTransform: "uppercase" },
  "font-bold": { fontWeight: "bold" },
  italic: { fontStyle: "italic" },

  // Layout
  flex: { display: "flex", flexDirection: "row" },
  "flex-col": { display: "flex", flexDirection: "column" },
  "justify-between": { justifyContent: "space-between" },
  "gap-4": { gap: 16 },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
    width: "100%",
  },
  "grid-cols-1": { width: "100%" },
  "grid-cols-2": { width: "50%" },
  "grid-cols-3": { width: "33.333333%" },
  "grid-cols-4": { width: "25%" },

  "col-span-1": { flexGrow: 0, flexShrink: 0, flexBasis: "100%" },
  "col-span-2": { flexGrow: 0, flexShrink: 0, flexBasis: "50%" },
  "col-span-3": { flexGrow: 0, flexShrink: 0, flexBasis: "33.333333%" },
  "col-span-4": { flexGrow: 0, flexShrink: 0, flexBasis: "25%" },
  //   "grid-cols-4": { width: "100%" },
  //   "col-span-3": { flexGrow: 0, flexShrink: 0, flexBasis: "75%" },
  relative: { position: "relative" },
  absolute: { position: "absolute" },

  // Padding
  "p-2": { padding: 8 },
  "px-4": { paddingLeft: 16, paddingRight: 16 },
  "py-2": { paddingTop: 8, paddingBottom: 8 },
  "p-1": { padding: 4 },
  "px-1": { paddingLeft: 4, paddingRight: 4 },

  // Border
  border: {
    borderWidth: 1,
    borderColor: "#000000",
    borderStyle: "solid",
  },
  "border-gray-400": {
    borderColor: "#b0b0b0",
  },
  "border-red-600": {
    borderColor: "#e11d48",
  },

  // Widths
  "w-1/2": { width: "50%" },
  "w-2/3": { width: "66.666667%" },
  "w-full": { width: "100%" },

  // Background Colors
  "bg-slate-200": { backgroundColor: "#e2e8f0" },
  "bg-slate-100": { backgroundColor: "#f1f5f9" },

  // Text Colors
  "text-red-600": { color: "#e11d48" },
  "text-xs": { fontSize: 10 },
  "text-left": { textAlign: "left" },
  "text-right": { textAlign: "right" },

  // Flex Growth
  "flex-4": { flex: 4 },
  "flex-2": { flex: 2 },
} as const;
export function cn(
  ...classNames: (string | Record<string, any> | false | null | undefined)[]
) {
  return classNames.reduce(
    (acc, curr) => {
      if (!curr) return acc;

      if (typeof curr === "string") {
        curr.split(" ").forEach((name) => {
          const style = tw[name as keyof typeof tw];
          if (style) Object.assign(acc, style);
        });
      }

      if (typeof curr === "object" && !Array.isArray(curr)) {
        Object.assign(acc, curr);
      }

      return acc;
    },
    {} as Record<string, any>,
  ) as any;
}

export function style(...names: (StyleType | false | undefined | null)[]) {
  return names.reduce(
    (acc, name) => {
      if (name && tw[name]) {
        Object.assign(acc, tw[name]);
      }
      return acc;
    },
    {} as Record<string, any>,
  );
}
