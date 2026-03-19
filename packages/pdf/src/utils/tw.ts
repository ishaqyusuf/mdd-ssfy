import { createTw } from "react-pdf-tailwind";

type PdfStyle = Record<string, unknown>;
type ClassValue = string | PdfStyle | false | null | undefined;

const tw = createTw({
  theme: {
    fontFamily: {
      sans: ["Comic Sans"],
    },
    extend: {
      colors: {
        custom: "#bada55",
      },
    },
  },
});

const unsupportedClassFallbacks: Record<string, PdfStyle> = {
  "col-span-1": { flexGrow: 0, flexShrink: 0, flexBasis: "100%" },
  "col-span-2": { flexGrow: 0, flexShrink: 0, flexBasis: "50%" },
  "col-span-3": { flexGrow: 0, flexShrink: 0, flexBasis: "33.333333%" },
  "col-span-4": { flexGrow: 0, flexShrink: 0, flexBasis: "25%" },
  "flex-4": { flex: 4 },
  "flex-2": { flex: 2 },
};

export function cn(...values: ClassValue[]): any {
  return values.reduce<PdfStyle>((acc, value) => {
    if (!value) return acc;

    if (typeof value === "string") {
      const tokens = value.split(/\s+/).filter(Boolean);
      if (!tokens.length) return acc;

      const supported: string[] = [];

      for (const token of tokens) {
        const fallback = unsupportedClassFallbacks[token];

        if (fallback) {
          Object.assign(acc, fallback);
          continue;
        }

        supported.push(token);
      }

      if (supported.length) {
        Object.assign(acc, tw(supported.join(" ")));
      }

      return acc;
    }

    Object.assign(acc, value);
    return acc;
  }, {});
}
