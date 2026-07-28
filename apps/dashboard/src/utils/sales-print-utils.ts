import {
	downloadSalesPrintDocument,
	openSalesPrintDocument,
	resolveSalesPrintMode,
} from "@/modules/sales-print/application/sales-print-service";
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
	const mode = resolveSalesPrintMode(props.mode);

	if (!salesIds.length) return;

	if (!props.pdf) {
		await openSalesPrintDocument({
			salesIds,
			mode,
			dispatchId: props.dispatchId ?? null,
		});
		return;
	}

	await downloadSalesPrintDocument({
		salesIds,
		mode,
		dispatchId: props.dispatchId ?? null,
	});
}
