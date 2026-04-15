import { EmployeeHeader } from "@/components/employee-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/employees/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Employee | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadEmployeeFilterParams(searchParams);
	const [initialFilterList, _initialEmployeeRows] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.employee.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.hrm.getEmployees.infiniteQueryOptions({
				...filter,
			}) as any,
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Employee</PageTitle>
					<EmployeeHeader initialFilterList={initialFilterList as any} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
