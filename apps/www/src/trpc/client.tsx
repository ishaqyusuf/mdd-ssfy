"use client";

import { useSession } from "@/lib/auth/client";
import { QueryEventsRuntime } from "@/lib/query-events/runtime";
import { generateRandomString } from "@/lib/utils";
import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import type { QueryClient } from "@gnd/ui/tanstack";
import { QueryClientProvider, isServer } from "@gnd/ui/tanstack";
import { createTRPCClient, httpBatchLink, loggerLink } from "@gnd/ui/tanstack";
import { useRef, useState } from "react";
import superjson from "superjson";
import { TRPCProvider } from "./context";
import { makeQueryClient } from "./query-client";

export { TRPCProvider, useTRPC } from "./context";

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
        serverTrpcUrl?: string;
    }>,
) {
    const queryClient = getQueryClient();
    const { data: session } = useSession();
    const authUserIdRef = useRef<string | null>(session?.user?.id ?? null);
    authUserIdRef.current = session?.user?.id ?? null;
    const [trpcClient] = useState(() =>
        createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: getTrpcUrl(props.serverTrpcUrl),
                    // url:
                    //     process.env.NODE_ENV === "production"
                    //         ? `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`
                    //         : `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
                    transformer: superjson as any,
                    headers() {
                        const id = authUserIdRef.current;
                        if (!id) {
                            return {};
                        }
                        return {
                            Authorization: `Bearer ${generateRandomString(16)}|${id}`,
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
                <QueryEventsRuntime />
                {props.children}
            </TRPCProvider>
        </QueryClientProvider>
    );
}

function getTrpcUrl(serverTrpcUrl?: string) {
    if (typeof window !== "undefined") {
        return "/api/trpc";
    }

    if (serverTrpcUrl) {
        return serverTrpcUrl;
    }

    return `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010").replace(
        /\/$/,
        "",
    )}/api/trpc`;
}
