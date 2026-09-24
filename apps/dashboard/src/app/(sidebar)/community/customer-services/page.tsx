import { CustomerServiceCalendar } from "@/components/customer-service-calendar";
import { CustomerServiceHeader } from "@/components/customer-service-header";
import { CustomerServiceScrollArea } from "@/components/customer-service-scroll-area";
import { ErrorFallback } from "@/components/error-fallback";
import { LazyWorkOrderFilterChart } from "@/components/lazy-work-order-filter-chart";
import { DataTable } from "@/components/tables-2/customer-service/data-table";
import { CustomerServiceSkeleton } from "@/components/tables-2/customer-service/skeleton";
import { WorkOrderSummaryWidgets } from "@/components/work-order-summary-widgets";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Customer Services | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const isCalendar = searchParams.view === "calendar";
	const filter = loadCustomerServiceFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = isCalendar
		? undefined
		: await getInitialTableSettings("customer-service");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["customerService"]["getCustomerServices"];

	batchPrefetch([
		...(!isCalendar
			? [
					trpc.customerService.getCustomerServices.infiniteQueryOptions(
						queryInput,
						{
							getNextPageParam: ({ meta }) =>
								(meta as { cursor?: string | number | null } | undefined)
									?.cursor,
						},
					),
				]
			: []),
	]);

	return (
		<CustomerServiceScrollArea>
			<PageShell className="min-w-0 px-4 pb-8 sm:px-6">
				<HydrateClient>
					<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
						<PageTitle>Customer Service</PageTitle>
						<p className="-mt-4 text-sm text-muted-foreground">
							Manage requests, appointments, and assignments in one place.
						</p>
						<WorkOrderSummaryWidgets />
						<LazyWorkOrderFilterChart />
						<div
							data-customer-service-toolbar
							className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:-mx-6 sm:px-6"
						>
							<CustomerServiceHeader />
						</div>
						{isCalendar ? (
							<CustomerServiceCalendar />
						) : (
							<ErrorBoundary errorComponent={ErrorFallback}>
								<Suspense
									fallback={
										<CustomerServiceSkeleton
											initialSettings={initialSettings}
										/>
									}
								>
									<DataTable initialSettings={initialSettings} />
								</Suspense>
							</ErrorBoundary>
						)}
					</div>
				</HydrateClient>
			</PageShell>
		</CustomerServiceScrollArea>
	);
}
