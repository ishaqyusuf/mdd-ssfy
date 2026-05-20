import "server-only";

import {
    HydrationBoundary,
    dehydrate,
    createTRPCClient,
    loggerLink,
    serverHttpBatchLink as httpBatchLink,
    type TRPCQueryOptions,
    createTRPCOptionsProxy,
} from "@gnd/ui/tanstack";

import { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
import { AppRouter } from "@gnd/api/trpc/routers/_app";
import { generateRandomString } from "@gnd/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers as nextHeaders } from "next/headers";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
    queryClient: getQueryClient,
    client: createTRPCClient({
        links: [
            httpBatchLink({
                url: `${getServerBaseUrl()}/api/trpc`,
                fetch: fetchWithRequestOrigin as typeof fetch,
                // url:
                //     process.env.NODE_ENV === "production"
                //         ? `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`
                //         : `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
                transformer: superjson as any,
                async headers() {
                    const session = await getServerSession(authOptions);
                    const userId = session?.user?.id;

                    if (!userId) {
                        return {};
                    }

                    return {
                        Authorization: `Bearer ${generateRandomString(16)}|${userId}`,
                    };
                },
            }),
            loggerLink({
                enabled: (opts) =>
                    process.env.NODE_ENV === "development" ||
                    (opts.direction === "down" && opts.result instanceof Error),
            }),
        ],
    }),
});

export function HydrateClient(props: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {props.children as any}
        </HydrationBoundary>
    );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
    queryOptions: T
) {
    const queryClient = getQueryClient();

    if (queryOptions.queryKey[1]?.type === "infinite") {
        void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
        void queryClient.prefetchQuery(queryOptions);
    }
}

function getServerBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function fetchWithRequestOrigin(
    input: RequestInfo | URL,
    init?: RequestInit
) {
    const requestOrigin = await getRequestOrigin();

    if (!requestOrigin) {
        return fetch(input, init);
    }

    const url = new URL(input instanceof Request ? input.url : input.toString());
    const requestUrl = new URL(`${url.pathname}${url.search}`, requestOrigin);

    return fetch(requestUrl, init);
}

async function getRequestOrigin() {
    const headers = await nextHeaders();
    const host =
        headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
        headers.get("host");

    if (!host) {
        return null;
    }

    const proto =
        headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
        (isLocalHost(host) ? "http" : "https");

    return `${proto}://${host}`;
}

function isLocalHost(host: string) {
    return (
        host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("[::1]")
    );
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
    queryOptionsArray: T[]
) {
    const queryClient = getQueryClient();

    for (const queryOptions of queryOptionsArray) {
        if (queryOptions.queryKey[1]?.type === "infinite") {
            void queryClient.prefetchInfiniteQuery(queryOptions as any);
        } else {
            void queryClient.prefetchQuery(queryOptions);
        }
    }
}
