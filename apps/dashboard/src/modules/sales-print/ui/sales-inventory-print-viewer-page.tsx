import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintUnavailable } from "@/components/print-sales-v2";
import { readSalesInventoryPrintParams } from "@/modules/sales-print/application/inventory-print-request";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { SalesInventoryPrintViewerClient } from "./sales-inventory-print-viewer-client";

interface SalesInventoryPrintViewerPageProps {
	searchParams: Record<string, string | string[] | undefined>;
}

export function SalesInventoryPrintViewerPage({
	searchParams,
}: SalesInventoryPrintViewerPageProps) {
	const params = readSalesInventoryPrintParams(searchParams);

	if (params.ids.length > 0) {
		batchPrefetch([
			trpc.print.salesInventoryV2.queryOptions(
				{
					ids: params.ids,
					mode: params.mode,
					templateId: params.templateId,
					preview: params.preview,
				},
				{
					staleTime: 60 * 1000,
					refetchOnWindowFocus: false,
				},
			),
		]);
	}

	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<PrintLoading />}>
					{params.ids.length ? (
						<SalesInventoryPrintViewerClient
							ids={params.ids}
							mode={params.mode}
							templateId={params.templateId}
							preview={params.preview}
						/>
					) : (
						<PrintUnavailable reason="missing-inventory-sales-ids" />
					)}
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
