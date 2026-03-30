import { CustomerHeader } from "@/components/customer-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/customers/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Customers | GND",
	});
}

export default async function Page() {
	return (
		<PageShell>
			<PageTitle>Sales Customers</PageTitle>
			<div className="flex flex-col gap-6">
				<CustomerHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
