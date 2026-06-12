import { SalesInventoryPrintViewerPage } from "@/modules/sales-print/ui/sales-inventory-print-viewer-page";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Inventory Print | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	return <SalesInventoryPrintViewerPage searchParams={searchParams} />;
}
