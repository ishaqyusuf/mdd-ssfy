import { SalesPrintViewerPage } from "@/modules/sales-print/ui/sales-print-viewer-page";
import { constructMetadata } from "@gnd/utils/construct-metadata";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Invoice | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	return <SalesPrintViewerPage searchParams={searchParams} />;
}
