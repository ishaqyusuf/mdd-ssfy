import { ErrorFallback } from "@/components/error-fallback";

import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { InboundReceivingPage } from "@/components/inventory/inbound-receiving-page";
import { PageTitle } from "@gnd/ui/custom/page-title";
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	await props.searchParams;
	return (
		<PageShell>
			<PageTitle>Inventory Inbounds</PageTitle>
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<InboundReceivingPage />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
