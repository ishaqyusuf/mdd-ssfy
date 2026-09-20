"use client";

import { QueryEventsRuntime } from "@/lib/query-events/runtime";
import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import type { QueryClient } from "@gnd/ui/tanstack";
import { QueryClientProvider, isServer } from "@gnd/ui/tanstack";
import { createTRPCClient, httpBatchLink, loggerLink, splitLink } from "@gnd/ui/tanstack";
import { useState } from "react";
import superjson from "superjson";
import { TRPCProvider } from "./context";
import { makeQueryClient } from "./query-client";

export { TRPCProvider, useTRPC, useTRPCClient } from "./context";

let browserQueryClient: QueryClient;
const salesCatalogProcedures = new Set([
	"newSalesForm.getStepRouting",
	"newSalesForm.getComponentCatalog",
	"newSalesForm.getComponentUsageRanks",
	"newSalesForm.getCatalogRevision",
	"newSalesForm.searchCustomComponents",
]);

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
	const [trpcClient] = useState(() =>
		createTRPCClient<AppRouter>({
			links: [
				splitLink({
					condition: (operation) =>
						process.env.NEXT_PUBLIC_SALES_CATALOG_FAST_ROUTE === "1" &&
						salesCatalogProcedures.has(operation.path),
					true: httpBatchLink({
						url: getTrpcUrl(props.serverTrpcUrl).replace(
							/\/api\/trpc$/,
							"/api/sales-catalog",
						),
						transformer: superjson as any,
					}),
					false: httpBatchLink({
						url: getTrpcUrl(props.serverTrpcUrl),
						transformer: superjson as any,
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

	return `${(
		process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"
	).replace(/\/$/, "")}/api/trpc`;
}
