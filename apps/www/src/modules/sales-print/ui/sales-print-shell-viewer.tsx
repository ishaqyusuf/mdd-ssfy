"use client";

import { PrintSalesV2 } from "@/components/print-sales-v2";
import { parseSalesPrintRequest } from "@/modules/sales-print/application/sales-print-request";
import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "@/modules/sales-print/application/sales-print-service";

export function SalesPrintShellViewer({
	href,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: {
	href: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
}) {
	const url = new URL(href, window.location.origin);
	const printRequest = parseSalesPrintRequest({
		pt: url.searchParams.get("pt") ?? undefined,
		token: url.searchParams.get("token") ?? undefined,
		accessToken: url.searchParams.get("accessToken") ?? undefined,
		snapshotId: url.searchParams.get("snapshotId") ?? undefined,
		preview: url.searchParams.get("preview") ?? undefined,
		templateId: url.searchParams.get("templateId") ?? undefined,
		pageBreakMode: url.searchParams.get("pageBreakMode") ?? undefined,
		showImages: url.searchParams.get("showImages") ?? undefined,
		headlineFirstPage: url.searchParams.get("headlineFirstPage") ?? undefined,
		mode: url.searchParams.get("mode") ?? undefined,
	});

	return (
		<div className="h-full w-full bg-background">
			<PrintSalesV2
				printRequest={printRequest}
				className="h-full"
				onPrintReady={onPrintReady}
				onPrintError={onPrintError}
				onPrintStage={onPrintStage}
			/>
		</div>
	);
}
