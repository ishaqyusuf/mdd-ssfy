import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintSalesV2 } from "@/components/print-sales-v2";
import { loadSalesPrintFilterParams } from "@/hooks/use-sales-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

interface SalesPrintViewerPageProps {
	searchParams: Record<string, string | string[] | undefined>;
}

export function SalesPrintViewerPage({
	searchParams,
}: SalesPrintViewerPageProps) {
	const filter = loadSalesPrintFilterParams(searchParams);
	batchPrefetch([
		trpc.print.salesV2.queryOptions({
			pt: filter.pt ?? "",
			token: filter.token ?? "",
			accessToken: filter.accessToken ?? "",
			snapshotId: filter.snapshotId ?? "",
			preview: filter.preview ?? false,
			templateId: filter.templateId ?? "template-2",
		}),
	]);

	return (
		<ErrorBoundary errorComponent={ErrorFallback}>
			<Suspense fallback={<PrintLoading />}>
				<PrintSalesV2 />
			</Suspense>
		</ErrorBoundary>
	);
}
