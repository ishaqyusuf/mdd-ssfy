import { ErrorFallback } from "@/components/error-fallback";
import { PrintContractorAccounting } from "@/components/print-contractor-accounting";
import { PrintLoading } from "@/components/print-loading";
import { loadContractorAccountingPrintFilterParams } from "@/hooks/use-contractor-accounting-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Accounting Report | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadContractorAccountingPrintFilterParams(searchParams);

	batchPrefetch([
		trpc.print.contractorAccounting.queryOptions({
			token: filter.token ?? "",
			preview: filter.preview ?? false,
		}),
	]);

	return (
		<ErrorBoundary errorComponent={ErrorFallback}>
			<Suspense fallback={<PrintLoading />}>
				<PrintContractorAccounting />
			</Suspense>
		</ErrorBoundary>
	);
}
