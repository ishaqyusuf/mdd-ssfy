type StyleType = keyof typeof tw;

const tw = {
  // Typography
  "text-sm": { fontSize: 12 },
  "font-mono": { fontFamily: "Courier" },

  // Layout
  flex: { display: "flex", flexDirection: "row" },
  "flex-col": { display: "flex", flexDirection: "column" },
  "gap-4": { gap: 16 },
  grid: { display: "flex", flexWrap: "wrap", flexDirection: "row" }, // mimic grid
  "grid-cols-4": { width: "100%" },
  "col-span-3": { flexGrow: 0, flexShrink: 0, flexBasis: "75%" },

  // Padding
  "p-2": { padding: 8 },
  "px-4": { paddingLeft: 16, paddingRight: 16 },
  "py-2": { paddingTop: 8, paddingBottom: 8 },

  // Border
  border: {
    borderWidth: 1,
    borderColor: "#000000",
    borderStyle: "solid",
  },
  "border-red-400": {
    borderColor: "#f87171",
  },

  // Widths
  "w-1/2": { width: "50%" },
  "w-2/3": { width: "66.666667%" },
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
