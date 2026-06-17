import { DispatchHeader } from "@/components/dispatch-header";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Dispatch Management | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("sales-dispatch");

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Dispatch Management</PageTitle>
				<div className="flex flex-col gap-6">
					<DispatchHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<SalesDispatchSkeleton
									initialSettings={initialSettings}
									driver
								/>
							}
						>
							<DataTable driver initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
