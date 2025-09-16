export const screens = {
    xs: { query: "(max-width: 768px)" },
    sm: { query: "(min-width: 640px)" },
    md: { query: "(min-width: 768px)" },
    lg: { query: "(min-width: 1024px)" },
    xl: { query: "(min-width: 1280px)" },
    "2xl": { query: "(min-width: 1536px)" },
    smallDevice: { query: "(max-width : 768px)" },
    mediumDevice: {
        query: "only screen and (min-width : 769px) and (max-width : 992px)"
    },
    largeDevice: {
        query: "only screen and (min-width : 993px) and (max-width : 1200px)"
    },
    extraDevice: {
        query: "only screen and (min-width : 1201px)"
    },
    bigScreen: { query: "(min-width: 1824px)" },
    tabletOrMobile: { query: "(max-width: 1224px)" },
    portrait: { query: "(orientation: portrait)" },
    retina: { query: "(min-resolution: 2dppx)" }
};
