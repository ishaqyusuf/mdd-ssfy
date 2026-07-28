import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import PageShell from "@/components/page-shell";
import { SalesOrdersV2Header } from "@/components/sales-orders-v2-header";
import { DataTable } from "@/components/tables-2/sales-orders/data-table";
import { SalesOrdersSkeleton } from "@/components/tables-2/sales-orders/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Bin | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("sales-orders");

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Sales Bin</PageTitle>
				<div className="flex flex-col gap-6">
					<SalesOrdersV2Header />
					<ErrorBoundary errorComponent={ErrorFallbackSales}>
						<Suspense
							fallback={
								<SalesOrdersSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable initialSettings={initialSettings} bin />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
