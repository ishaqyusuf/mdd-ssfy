import { openSalesPrintDocument } from "@/modules/sales-print/application/sales-print-service";

interface PrintQuoteProps {
	salesIds: number[];
	preview?: boolean;
}
export async function printQuote(props: PrintQuoteProps) {
	await openSalesPrintDocument({
		salesIds: props.salesIds,
		mode: "quote",
	});
}
