import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { EmployeeOverviewClient } from "./employee-overview-client";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({ title: "Employee Overview | GND" });
}

type Props = {
	params: Promise<{ id: string }>;
};

export default async function Page(props: Props) {
	const { id } = await props.params;
	const employeeId = Number(id);

	batchPrefetch([
		trpc.hrm.getEmployeeOverview.queryOptions({ id: employeeId }),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Employee Overview</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<div>Loading employee...</div>}>
							<EmployeeOverviewClient employeeId={employeeId} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
