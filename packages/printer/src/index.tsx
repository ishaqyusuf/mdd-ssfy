// export * from "./templates/html";
// export * from "./templates/pdf";
// export * from "./templates/og";
// export * from "./editor";
// export * from "./utils/logo";

import { Font } from "@react-pdf/renderer";

export { renderToStream, renderToBuffer } from "@react-pdf/renderer";
Font.register({
  family: "Mono",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/courierprime/v6/u-450q2lgwslOqpF_6gQ8kELaw.ttf",
      fontStyle: "normal",
      fontWeight: "normal",
    },
  ],
});
Font.register({
  family: "Geist",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
      // format: "woff2",
      fontWeight: 500,
    },
  ],
});
Font.register({
  family: "Roboto",
  src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf",
});
Font.register({
  family: "Mono",
  src: "https://fonts.gstatic.com/s/courierprime/v6/u-450q2lgwslOqpF_6gQ8kELaw.ttf",
});
