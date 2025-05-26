import "@gnd/ui/globals.css";
import "@/styles/globals.css";

import { Suspense } from "react";
import AppProvider from "@/components/_v1/app-provider";
import { TailwindIndicator } from "@/components/_v1/tailwind-indicator";
import Upgrader from "@/components/_v1/upgrader";
import UserAccountUpdateRequiredModal from "@/components/modals/user-account-update-required-modal";
import { env } from "@/env.mjs";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import PageAnalytics from "@/lib/analytics/page-analytics";
import { __isProd } from "@/lib/is-prod-server";
import { cn } from "@/lib/utils";
import { ReactQueryProvider } from "@/providers/react-query";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Provider as Analytics } from "@gnd/events/client";
import { Toaster as MiddayToast, Toaster } from "@gnd/ui/toaster";

import { QueryTabProvider } from "./(clean-code)/_common/query-tab/provider";
import { SessionProvider } from "@/hooks/use-session";

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
    // trashSoftDeletesAction();
    return (
        <html lang="en" suppressHydrationWarning>
            {/* <Suspense> */}
            <ReactQueryProvider>
                <SpeedInsights />
                <body>
                    <Toaster />
                    <MiddayToast />
                    <div className="print:hidden">
                        <AppProvider>
                            <Suspense>
                                <SessionProvider>
                                    <QueryTabProvider>
                                        {children}
                                        <UserAccountUpdateRequiredModal />
                                        <PageAnalytics />
                                    </QueryTabProvider>
                                </SessionProvider>
                            </Suspense>
                        </AppProvider>
                        <div
                            className={cn(
                                __isProd
                                    ? "fixed bottom-0 left-0 z-[9999] h-5 w-5 overflow-hidden opacity-0"
                                    : "fixed bottom-0 right-0 mb-2",
                            )}
                        >
                            <Upgrader />
                        </div>

                        <Analytics />
                        <TailwindIndicator />
                        {prodDB && !__isProd && (
                            <div className="fixed left-0 right-0 top-0 z-[999] flex justify-center  bg-red-500 text-sm text-white">
                                Production Database
                            </div>
                        )}
                    </div>
                </body>
            </ReactQueryProvider>
            {/* </Suspense> */}
        </html>
    );
}
