/** @type {import('next').NextConfig} */
const path = require("path");
// const { NormalModuleReplacementPlugin } = require("webpack");
const nextConfig = {
    transpilePackages: [
        "@gnd/api",
        // "@gnd/auth",
        // "@gnd/db",
        // "@gnd/common",
        "@gnd/ui",
        "@gnd/printer",
        // "@gnd/stripe",
    ],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
                port: "",
                // pathname: "/account123/**"
            },
            {
                protocol: "https",
                hostname: "plus.unsplash.com",
                port: "",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                port: "",
            },
            {
                protocol: "https",
                hostname: "gndmillwork.com",
                port: "",
            },
        ],
    },
    experimental: {
        serverComponentsExternalPackages: ["puppeteer-core"],
    },
    // webpack: (
    //     config,
    //     { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
    // ) => {
    //     config.plugins = config.plugins || [];
    //     config.plugins.push(
    //         new NormalModuleReplacementPlugin(
    //             /email\/render/,
    //             path.resolve(__dirname, "./renderEmailFix.js")
    //         )
    //     );
    //     // Important: return the modified config
    //     return config;
    // },
    async headers() {
        return [
            {
                // matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET,DELETE,PATCH,POST,PUT",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
