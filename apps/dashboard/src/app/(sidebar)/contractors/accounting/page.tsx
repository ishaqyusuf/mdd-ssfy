import { ContractorAccountingPage } from "@/components/contractor-accounting-page";
import { ScrollableContent } from "@/components/scrollable-content";
import {
	getDefaultContractorAccountingReportPeriod,
	loadContractorAccountingReportParams,
} from "@/hooks/use-contractor-accounting-report-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Accounting | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function ContractorAccountingRoute({
	searchParams,
}: Props) {
	const loaded = loadContractorAccountingReportParams(await searchParams);
	const defaults = getDefaultContractorAccountingReportPeriod();
	const period = {
		from: loaded.from || defaults.from,
		to: loaded.to || defaults.to,
		timezone: loaded.timezone || defaults.timezone,
	} satisfies Pick<
		RouterInputs["jobs"]["contractorPeriodReport"],
		"from" | "to" | "timezone"
	>;

	batchPrefetch([
		trpc.jobs.contractorPeriodReport.queryOptions({
			...period,
			includeEntries: false,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Contractor Accounting</PageTitle>
					<ContractorAccountingPage initialPeriod={period} />
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
