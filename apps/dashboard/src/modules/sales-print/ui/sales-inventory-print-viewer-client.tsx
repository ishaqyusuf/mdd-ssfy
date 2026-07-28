"use client";

import { PrintLoading } from "@/components/print-loading";
import type { RenderedInventoryPdfPrintViewerProps } from "@/components/rendered-inventory-pdf-print-viewer";
import dynamic from "next/dynamic";

const RenderedInventoryPdfPrintViewer = dynamic(
	() =>
		import("@/components/rendered-inventory-pdf-print-viewer").then(
			(mod) => mod.RenderedInventoryPdfPrintViewer,
		),
	{
		ssr: false,
		loading: () => <PrintLoading />,
	},
);

export function SalesInventoryPrintViewerClient(
	props: RenderedInventoryPdfPrintViewerProps,
) {
	return <RenderedInventoryPdfPrintViewer {...props} />;
}
