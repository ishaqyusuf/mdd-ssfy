import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintSalesV2 } from "@/components/print-sales-v2";
import { parseSalesPrintRequest } from "@/modules/sales-print/application/sales-print-request";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

interface SalesPrintViewerPageProps {
	searchParams: Record<string, string | string[] | undefined>;
}

export function SalesPrintViewerPage({
	searchParams,
}: SalesPrintViewerPageProps) {
	const printRequest = parseSalesPrintRequest(searchParams);
	const { params } = printRequest;

	if (printRequest.isValid && printRequest.renderMode === "rendered-pdf") {
		batchPrefetch([
			trpc.print.salesV2.queryOptions({
				pt: params.pt,
				token: params.token,
				accessToken: params.accessToken,
				snapshotId: params.snapshotId,
				preview: params.preview,
				templateId: params.templateId,
			}),
		]);
	}

	return (
		<ErrorBoundary errorComponent={ErrorFallback}>
			<Suspense fallback={<PrintLoading />}>
				<PrintSalesV2 printRequest={printRequest} />
			</Suspense>
		</ErrorBoundary>
	);
}
