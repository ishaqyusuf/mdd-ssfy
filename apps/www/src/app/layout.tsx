// import "@/styles/globals.css";
import "@gnd/ui/globals.css";

import { ContractorCustomJob } from "@/components/contractor-custom-job";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { env } from "@/env.mjs";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import { __isProd } from "@/lib/is-prod-server";
import { cn } from "@/lib/utils";
// import { ReactQueryProvider } from "@/providers/react-query";
import { SpeedInsights } from "@vercel/speed-insights/next";

// import { Provider as Analytics } from "@gnd/events/client";
import { Toaster as MiddayToast, Toaster } from "@gnd/ui/toaster";

import { Providers } from "./providers";
import { Suspense } from "react";
import { StaticTrpc } from "@/components/static-trpc";

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
    return (
        <html lang="en" suppressHydrationWarning>
            <SpeedInsights />
            <body>
                <div className="print:hidden">
                    <Toaster />
                    <MiddayToast />
                    <Suspense>
                        <Providers>
                            <StaticTrpc />
                            {children}
                            {env.NODE_ENV !== "production" ? (
                                <div className="fixed bottom-1 left-1 z-[9999] flex items-center gap-2 print:hidden">
                                    <TailwindIndicator />
                                    <ContractorCustomJob />
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
