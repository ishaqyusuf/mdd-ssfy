import { downloadSalesDocument, quickPrint } from "@/lib/quick-print";
import type { IOrderPrintMode } from "@/types/sales";

interface Props extends SalesPrintProps {}
export type SalesPrintProps = {
	slugs?: string;
	mode: IOrderPrintMode;
	mockup?: "yes" | "no";
	preview?: boolean;
	pdf?: boolean;
	deletedAt?;
	dispatchId?;
};
export async function printSalesData(props: Props) {
	const salesIds =
		props.slugs
			?.toString()
			.split(",")
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value)) || [];
	const mode = toPrintMode(props.mode);

	if (!salesIds.length) return;

	if (!props.pdf) {
		await quickPrint({
			salesIds,
			mode,
			dispatchId: props.dispatchId ?? null,
			v2: true,
		});
		return;
	}

	await downloadSalesDocument({
		salesIds,
		mode,
		dispatchId: props.dispatchId ?? null,
	});
}

function toPrintMode(mode: IOrderPrintMode) {
	switch (mode) {
		case "order":
			return "invoice" as const;
		case "packing list":
			return "packing-slip" as const;
		case "production":
			return "production" as const;
		case "quote":
			return "quote" as const;
		case "order-packing":
			return "order-packing" as const;
		default:
			return "invoice" as const;
	}
}
