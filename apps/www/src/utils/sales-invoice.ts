import { quickPrint } from "@/lib/quick-print";

interface PrintQuoteProps {
	salesIds: number[];
	preview?: boolean;
}
export async function printQuote(props: PrintQuoteProps) {
	await quickPrint({
		salesIds: props.salesIds,
		mode: "quote",
		v2: true,
	});
}
