import { EmployeeListPage } from "@/features/employee-management";
import { loadEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
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
	batchPrefetch([
		trpc.hrm.getEmployees.infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<PageShell>
			<div className="flex flex-col gap-6 pt-6">
				<PageTitle>Employees</PageTitle>
				<Suspense>
					<EmployeeListPage />
				</Suspense>
			</div>
		</PageShell>
	);
}
