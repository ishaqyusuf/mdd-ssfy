import { AccountPageClient } from "@/components/storefront/account-page-client";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";

export default function AccountPage() {
	prefetch(trpc.storefrontCommerce.account.get.queryOptions());
	prefetch(
		trpc.storefrontCommerce.orders.list.queryOptions({
			status: "all",
			limit: 3,
		}),
	);
	return (
		<HydrateClient>
			<Suspense fallback={<AccountSkeleton />}>
				<AccountPageClient />
			</Suspense>
		</HydrateClient>
	);
}

function AccountSkeleton() {
	return (
		<main className="container mx-auto min-h-[60vh] animate-pulse px-4 py-10">
			<div className="h-10 w-64 rounded bg-muted" />
			<div className="mt-8 grid gap-6 lg:grid-cols-2">
				<div className="h-96 rounded bg-muted" />
				<div className="h-96 rounded bg-muted" />
			</div>
		</main>
	);
}
