import { OrderDetailClient } from "@/components/storefront/order-detail-client";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";

export default async function OrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const orderId = decodeURIComponent(id);
	prefetch(
		trpc.storefrontCommerce.orders.detail.queryOptions({
			orderId,
		}),
	);
	return (
		<HydrateClient>
			<Suspense fallback={<OrderDetailSkeleton />}>
				<OrderDetailClient orderId={orderId} />
			</Suspense>
		</HydrateClient>
	);
}

function OrderDetailSkeleton() {
	return (
		<main className="container mx-auto min-h-[60vh] animate-pulse px-4 py-10">
			<div className="h-10 w-72 rounded bg-muted" />
			<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="h-96 rounded bg-muted" />
				<div className="h-72 rounded bg-muted" />
			</div>
		</main>
	);
}
