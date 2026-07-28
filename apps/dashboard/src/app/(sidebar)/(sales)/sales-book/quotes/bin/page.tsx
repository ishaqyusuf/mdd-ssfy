import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesQuoteHeader } from "@/components/sales-quote-header";
import { DataTable } from "@/components/tables-2/sales-quotes/data-table";
import { SalesQuotesSkeleton } from "@/components/tables-2/sales-quotes/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Quotes Bin | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("sales-quotes");

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Quotes Bin</PageTitle>
				<div className="flex flex-col gap-6">
					<SalesQuoteHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<SalesQuotesSkeleton initialSettings={initialSettings} />
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
