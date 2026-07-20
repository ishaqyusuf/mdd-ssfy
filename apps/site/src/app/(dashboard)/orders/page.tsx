import { OrdersPageClient } from "@/components/storefront/orders-page-client";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type OrdersPageProps = {
	searchParams: Promise<{
		q?: string;
		status?: "all" | "processing" | "in-transit" | "delivered" | "cancelled";
	}>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const params = await searchParams;
	const input = {
		query: params.q || undefined,
		status: params.status || ("all" as const),
		limit: 20,
	};
	prefetch(trpc.storefrontCommerce.orders.list.queryOptions(input));
	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={OrdersPageError}>
				<Suspense fallback={<OrdersPageSkeleton />}>
					<OrdersPageClient initialInput={input} />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}

function OrdersPageSkeleton() {
	return (
		<main className="container mx-auto min-h-[60vh] animate-pulse px-4 py-10">
			<div className="h-10 w-56 rounded bg-muted" />
			<div className="mt-8 h-14 rounded bg-muted" />
			<div className="mt-6 space-y-4">
				<div className="h-40 rounded bg-muted" />
				<div className="h-40 rounded bg-muted" />
			</div>
		</main>
	);
}

function OrdersPageError() {
	return (
		<main className="container mx-auto min-h-[60vh] px-4 py-16 text-center">
			<h1 className="text-2xl font-semibold">Unable to load orders</h1>
			<p className="mt-2 text-muted-foreground">
				Sign in again or refresh the page to retry.
			</p>
		</main>
	);
}
