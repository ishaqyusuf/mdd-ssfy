import { EmployeeListPage } from "@/features/employee-management";
import { loadEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Employees v2 | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadEmployeeFilterParams(searchParams);
	const initialSettings = await getInitialTableSettings("employees");

	batchPrefetch([
		trpc.filters.employee.queryOptions(),
		trpc.orgs.getOrganizationProfile.queryOptions(),
		trpc.hrm.getEmployees.infiniteQueryOptions(
			{
				...filter,
			},
			{
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Employees</PageTitle>
						<EmployeeListPage initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
