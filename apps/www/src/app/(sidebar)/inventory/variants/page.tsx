import { ErrorFallback } from "@/components/error-fallback";

import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, getQueryClient } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const queryClient = getQueryClient();
	const searchParams = await props.searchParams;

	return (
		<PageShell>
			<PageTitle>Inventory</PageTitle>
			{/* <InventoryTabSwitch path="/inventory" /> */}
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}></Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
