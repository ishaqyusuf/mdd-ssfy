"use client";

import { getBaseUrl } from "@/lib/base-url";
import { getToken } from "@/lib/session-store";
import type { AppRouter } from "@api/trpc/routers/_app";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider, isServer } from "@tanstack/react-query";
import {
	createTRPCClient,
	httpBatchLink,
	httpLink,
	loggerLink,
	splitLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
// import { generateRandomString } from "@/lib/utils";
// import { authUser } from "@/app-deps/(v1)/_actions/utils";

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

function getTrpcUrl() {
	return `${getBaseUrl()}/api/trpc`;
}

async function getTrpcHeaders() {
	const headers = new Map<string, string>();
	const token = getToken();
	if (token) {
		headers.set("x-app-authorization", `Bearer ${token}`);
	}
	headers.set("x-trpc-source", "app");
	return Object.fromEntries(headers);
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
				splitLink({
					condition: (op) => op.type === "mutation",
					true: httpLink({
						url: getTrpcUrl(),
						transformer: superjson,
						headers: getTrpcHeaders,
					}),
					false: httpBatchLink({
						url: getTrpcUrl(),
						transformer: superjson,
						headers: getTrpcHeaders,
					}),
				}),
				loggerLink({
					enabled: (opts) =>
						process.env.NODE_ENV === "development" ||
						(opts.direction === "down" && opts.result instanceof Error),
				}),
			],
		}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{props.children}
			</TRPCProvider>
		</QueryClientProvider>
	);
}
