import "server-only";

import type { AppRouter } from "@gnd/api/trpc/routers/dealership-app";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import {
  type TRPCQueryOptions,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import { headers as nextHeaders } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

function getServerBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006";
}

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient({
    links: [
      httpBatchLink({
        transformer: superjson as any,
        url: `${getServerBaseUrl()}/api/trpc`,
        fetch: fetchWithRequestOrigin as typeof fetch,
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
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();

  if (queryOptions.queryKey[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[],
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

async function fetchWithRequestOrigin(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const requestHeaders = await nextHeaders();
  const requestOrigin = getRequestOrigin(requestHeaders);
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );

  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value);
  });
  copyRequestHeader(requestHeaders, headers, "cookie");
  copyRequestHeader(requestHeaders, headers, "authorization");
  copyRequestHeader(requestHeaders, headers, "origin");
  copyRequestHeader(requestHeaders, headers, "referer");
  copyRequestHeader(requestHeaders, headers, "user-agent");
  copyRequestHeader(requestHeaders, headers, "accept-language");
  copyRequestHeader(requestHeaders, headers, "x-forwarded-for");
  copyRequestHeader(requestHeaders, headers, "x-forwarded-host");
  copyRequestHeader(requestHeaders, headers, "x-forwarded-proto");

  if (!requestOrigin) {
    return fetch(input, {
      ...init,
      headers,
    });
  }

  const url = new URL(input instanceof Request ? input.url : input.toString());
  const requestUrl = new URL(`${url.pathname}${url.search}`, requestOrigin);

  return fetch(requestUrl, {
    ...init,
    headers,
  });
}

function copyRequestHeader(source: Headers, target: Headers, key: string) {
  const value = source.get(key);

  if (value) {
    target.set(key, value);
  }
}

function getRequestOrigin(headers: Headers) {
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
