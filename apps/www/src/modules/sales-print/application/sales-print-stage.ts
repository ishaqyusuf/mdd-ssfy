import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "./sales-print-service";

export function getSalesPrintStageToast(
	stage: SalesPrintStage,
	details?: SalesPrintStageDetails,
) {
	switch (stage) {
		case "resolve-access-start":
			return {
				title: "Preparing print...",
				description:
					(details?.salesIds?.length ?? 0) > 1
						? "Requesting access for selected orders."
						: "Requesting document access.",
			};
		case "resolve-access-done":
			return {
				title: "Print access ready",
				description: "Loading the print viewer.",
			};
		case "hidden-viewer-mounted":
			return {
				title: "Print viewer loading",
				description: "Waiting for the PDF viewer to finish loading.",
			};
		case "print-data-query-start":
			return {
				title: "Loading selected orders",
				description: "Preparing printable sales data.",
			};
		case "print-data-query-done":
			return {
				title: "Rendering PDF",
				description: "Sales data loaded. Waiting for the PDF frame.",
			};
		case "pdf-iframe-load":
			return {
				title: "PDF loaded",
				description: "Opening the browser print dialog.",
			};
		case "print-dialog-called":
			return {
				title: "Print dialog opened",
				description: "Choose a printer to finish printing.",
			};
		case "print-timeout":
			return {
				title: "Print viewer needs attention",
				description:
					details?.message ||
					"The hidden print viewer is taking longer than expected.",
			};
		case "resolve-access-error":
		case "print-data-query-error":
			return {
				title: "Unable to prepare print",
				description:
					details?.error instanceof Error
						? details.error.message
						: details?.message || "Please try again.",
			};
		default:
			return {
				title: "Preparing print...",
				description: "Working on the print request.",
			};
	}
}
