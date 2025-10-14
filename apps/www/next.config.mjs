import { withSentryConfig } from "@sentry/nextjs";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
/** @type {import('next').NextConfig} */
// const path = require("path");
// const { NormalModuleReplacementPlugin } = require("webpack");
const config = {
    transpilePackages: [
        // "@gnd/api",
        // "@gnd/auth",
        // "@gnd/db",
        // "@gnd/common",
        "@gnd/ui",
        "@gnd/printer",
        // "@gnd/stripe",
    ],
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    devIndicators: false,
    images: {
        // loader: "custom",
        // loaderFile: "./image-loader.ts",
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
            // {
            //     protocol: "https",
            //     hostname: "res.cloudinary.com",
            //     port: "",
            //     // pathname: "/account123/**"
            // },
            // {
            //     protocol: "https",
            //     hostname: "plus.unsplash.com",
            //     port: "",
            // },
            // {
            //     protocol: "https",
            //     hostname: "images.unsplash.com",
            //     port: "",
            // },
            // {
            //     protocol: "https",
            //     hostname: "wbycmglit0cmqbex.public.blob.vercel-storage.com",
            //     port: "",
            // },
            // {
            //     protocol: "https",
            //     hostname: "gndmillwork.com",
            //     port: "",
            // },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "3mb",
        },
    },
    // experimental: {
    serverExternalPackages: ["puppeteer-core"],
    // },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.plugins = [...config.plugins, new PrismaPlugin()];
        }

        return config;
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

// module.exports = nextConfig;
const isProduction = process.env.NODE_ENV === "production";

export default isProduction
    ? withSentryConfig(config, {
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          telemetry: false,

          // Only print logs for uploading source maps in CI
          silent: !process.env.CI,

          // Upload source maps for better stack traces
          widenClientFileUpload: true,

          // Tree-shake Sentry logger statements to reduce bundle size
          disableLogger: true,
      })
    : config;
