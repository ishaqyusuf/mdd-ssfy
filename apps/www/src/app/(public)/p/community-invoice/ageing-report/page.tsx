import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { PrintCommunityInvoiceAgingReport } from "@/components/print-community-invoice-aging-report";
import { PrintLoading } from "@/components/print-loading";
import { loadCommunityInvoiceAgingPrintFilterParams } from "@/hooks/use-community-invoice-aging-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Community Invoice Aging Report | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadCommunityInvoiceAgingPrintFilterParams(searchParams);

	batchPrefetch([
		trpc.print.communityInvoiceAgingReport.queryOptions({
			token: filter.token ?? "",
			preview: filter.preview ?? false,
		}),
	]);

	return (
		<PageShell>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<PrintLoading />}>
					<PrintCommunityInvoiceAgingReport />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
