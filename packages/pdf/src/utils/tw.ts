import { createTw } from "react-pdf-tailwind";

// The 'theme' object is your Tailwind theme config
export const cn = createTw({
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
