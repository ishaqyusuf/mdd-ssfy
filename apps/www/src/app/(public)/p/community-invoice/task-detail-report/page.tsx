import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { PrintCommunityInvoiceTaskDetailReport } from "@/components/print-community-invoice-task-detail-report";
import { PrintLoading } from "@/components/print-loading";
import { loadCommunityInvoicePrintFilterParams } from "@/hooks/use-community-invoice-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Community Invoice Task Detail Report | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadCommunityInvoicePrintFilterParams(searchParams);

	batchPrefetch([
		trpc.print.communityInvoiceTaskDetailReport.queryOptions({
			token: filter.token ?? "",
			preview: filter.preview ?? false,
		}),
	]);

	return (
		<PageShell>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<PrintLoading />}>
					<PrintCommunityInvoiceTaskDetailReport />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
