// import "@/styles/globals.css";
import "@gnd/ui/globals.css";

import { TailwindIndicator } from "@/components/tailwind-indicator";
import { env } from "@/env.mjs";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import { __isProd } from "@/lib/is-prod-server";
import { cn } from "@/lib/utils";
// import { ReactQueryProvider } from "@/providers/react-query";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Toaster as MiddayToast, Toaster } from "@gnd/ui/toaster";

import { Providers } from "./providers";
import { headers } from "next/headers";
import { Suspense } from "react";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `GND Millwork - gndprodesk.com`,
    });
}
// const inter = Inter({ subsets: ["latin"] });
export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const prodDB = env.DATABASE_URL?.includes("pscale");
    const serverTrpcUrl = getServerTrpcUrl(await headers());

    return (
        <html lang="en" suppressHydrationWarning>
            {env.NODE_ENV === "production" ? <SpeedInsights /> : null}
            <body>
                <div className="print:hidden">
                    <Toaster />
                    <MiddayToast />
                    <Suspense>
                        <Providers serverTrpcUrl={serverTrpcUrl}>
                            {children}
                            {env.NODE_ENV !== "production" ? (
                                <div className="fixed bottom-1 left-1 z-[9999] flex items-center gap-2 print:hidden">
                                    <TailwindIndicator />
                                </div>
                            ) : null}
                        </Providers>
                    </Suspense>
                    {/* <Analytics /> */}
                    {prodDB && !__isProd && (
                        <div className="fixed left-0 right-0 top-0 z-[999] flex justify-center  bg-red-500 text-sm text-white">
                            Production Database
                        </div>
                    )}
                </div>
            </body>
        </html>
    );
}

function getServerTrpcUrl(headersList: { get(name: string): string | null }) {
    const forwardedHost =
        headersList.get("x-forwarded-host") ?? headersList.get("host");
    const forwardedProto = headersList.get("x-forwarded-proto") ?? "http";

    if (forwardedHost) {
        const host = forwardedHost.split(",")[0]?.trim();
        const protocol = forwardedProto.split(",")[0]?.trim() || "http";

        if (host && protocol === "https" && isLocalDevHost(host)) {
            const port =
                process.env.PORTLESS_APP_PORT ?? process.env.PORT ?? "3000";
            return `http://127.0.0.1:${port}/api/trpc`;
        }

        if (host) {
            return `${protocol}://${host}/api/trpc`;
        }
    }

    return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/trpc`;
}

function isLocalDevHost(hostname: string) {
    const host = hostname.split(":")[0];

    return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".localhost") ||
        host.endsWith(".test")
    );
}
