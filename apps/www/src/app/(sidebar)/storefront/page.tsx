import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { StorefrontAdminWorkspace } from "@/components/storefront/storefront-admin-workspace";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Storefront | GND",
	});
}

type Props = {
	searchParams: Promise<{ tab?: string }>;
};

export default async function StorefrontPage({ searchParams }: Props) {
	const { tab = "catalog" } = await searchParams;
	batchPrefetch([
		trpc.storefrontAdmin.workspace.queryOptions(),
		trpc.storefrontAdmin.settings.get.queryOptions(),
	]);
	if (tab === "carts") {
		batchPrefetch([
			trpc.storefrontAdmin.operations.carts.queryOptions({ limit: 25 }),
		]);
	}
	if (tab === "orders") {
		batchPrefetch([
			trpc.storefrontAdmin.operations.orders.queryOptions({ limit: 25 }),
		]);
	}
	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Storefront</PageTitle>
						<StorefrontAdminWorkspace initialTab={tab} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
