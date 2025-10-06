"use client";

import type { QueryClient } from "@gnd/ui/tanstack";
import { QueryClientProvider, isServer } from "@gnd/ui/tanstack";
import { createTRPCClient, httpBatchLink, loggerLink } from "@gnd/ui/tanstack";
import { createTRPCContext } from "@gnd/ui/tanstack";
import { useState } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
import { AppRouter } from "@gnd/api/trpc/routers/_app";
import { generateRandomString } from "@/lib/utils";
import { authUser } from "@/app/(v1)/_actions/utils";
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient;

function getQueryClient() {
    if (isServer) {
        // Server: always make a new query client
        return makeQueryClient();
    }

    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();

    return browserQueryClient;
}

export function TRPCReactProvider(
    props: Readonly<{
        children: React.ReactNode;
    }>,
) {
    const queryClient = getQueryClient();
    const [trpcClient] = useState(() =>
        createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    // url: `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
                    url:
                        process.env.NODE_ENV === "production"
                            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`
                            : `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
                    transformer: superjson as any,
                    async headers() {
                        const auth = await authUser();
                        return {
                            Authorization: `Bearer ${generateRandomString(16)}|${auth?.id}`,
                        };
                    },
                }),
                loggerLink({
                    enabled: (opts) =>
                        process.env.NODE_ENV === "development" ||
                        (opts.direction === "down" &&
                            opts.result instanceof Error),
                }),
            ],
        }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
                {props.children as any}
            </TRPCProvider>
        </QueryClientProvider>
    );
}
