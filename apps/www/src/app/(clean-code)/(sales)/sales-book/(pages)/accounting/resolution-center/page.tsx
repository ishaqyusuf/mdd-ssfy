import { ErrorFallback } from "@/components/error-fallback";
import { ResolutionCenter } from "@/components/resolution-center";
import { SalesResolutionHeader } from "@/components/sales-resolution-header";
import { _perm, _role } from "@/components/sidebar/links";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { searchParamsCache } from "./search-params";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata({}) {
	return constructMetadata({
		title: `Payment Resolution - gndprodesk.com`,
	});
}
export default async function Page({ searchParams }) {
	// loadResolutionCenterFilterParams(await searchParams);
	return (
		<PageShell>
			<PageTitle>Resolution Center</PageTitle>
			<div className="flex flex-col gap-6">
				<SalesResolutionHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<ResolutionCenter />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
