import { ErrorFallback } from "@/components/error-fallback";
import { InventoryImportControlCenter } from "@/components/inventory/inventory-import-control-center";
import { InventoryImportControlCenterSkeleton } from "@/components/inventory/inventory-import-control-center-skeleton";
import { loadInventoryImportFilterParams } from "@/hooks/use-inventory-import-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { InventoryImport } from "@gnd/inventory/schema";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadInventoryImportFilterParams(searchParams);
	const initialTableSettings =
		await getInitialTableSettings("inventory-import");
	const initialScope = filter.scope ?? "active";
	const queryInput = {
		size: 200,
		scope: initialScope,
		q: filter.q,
	} as InventoryImport;

	await getQueryClient().prefetchQuery(
		trpc.inventories.inventoryImports.queryOptions(queryInput),
	);

	return (
		<PageShell>
			<PageTitle>Inventory Imports</PageTitle>
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<InventoryImportControlCenterSkeleton />}>
						<InventoryImportControlCenter
							initialScope={initialScope}
							initialTableSettings={initialTableSettings}
						/>
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
