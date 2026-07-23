import "server-only";

import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import { HydrationBoundary } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
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
	return (
		process.env.STOREFRONT_APP_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3018"
	).replace(/\/$/, "");
}

export const trpc = createTRPCOptionsProxy<AppRouter>({
	queryClient: getQueryClient,
	client: createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${getServerBaseUrl()}/api/storefront/trpc`,
				transformer: superjson as never,
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
	const queryClient = getQueryClient();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{props.children}
		</HydrationBoundary>
	);
}

type StorefrontResolverDef = {
	input: unknown;
	output: unknown;
	transformer: boolean;
	errorShape: unknown;
	featureFlags: { keyPrefix: boolean };
};

type StorefrontQueryOptions = ReturnType<
	TRPCQueryOptions<StorefrontResolverDef>
>;

export async function prefetch<T extends StorefrontQueryOptions>(
	queryOptions: T,
) {
	const queryClient = getQueryClient();

	if (queryOptions.queryKey[1]?.type === "infinite") {
		await queryClient.prefetchInfiniteQuery(
			queryOptions as unknown as Parameters<
				typeof queryClient.prefetchInfiniteQuery
			>[0],
		);
	} else {
		await queryClient.prefetchQuery(queryOptions);
	}
}

export async function batchPrefetch<T extends StorefrontQueryOptions>(
	queryOptionsArray: T[],
) {
	const queryClient = getQueryClient();

	await Promise.all(
		queryOptionsArray.map((queryOptions) => {
			if (queryOptions.queryKey[1]?.type === "infinite") {
				return queryClient.prefetchInfiniteQuery(
					queryOptions as unknown as Parameters<
						typeof queryClient.prefetchInfiniteQuery
					>[0],
				);
			}

			return queryClient.prefetchQuery(queryOptions);
		}),
	);
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
	copyRequestHeader(requestHeaders, headers, "x-request-id");

	if (!requestOrigin) {
		return fetch(input, {
			...init,
			credentials: "include",
			headers,
		});
	}

	const url = new URL(input instanceof Request ? input.url : input.toString());
	const requestUrl = new URL(`${url.pathname}${url.search}`, requestOrigin);

	return fetch(requestUrl, {
		...init,
		credentials: "include",
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
