import { SalesDocumentPreviewPage } from "@/components/sales-document-preview-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Document Preview | GND",
	});
}

export default async function Page(props: {
	searchParams: Promise<{
		pt?: string;
		token?: string;
		accessToken?: string;
		snapshotId?: string;
		templateId?: string;
		pageBreakMode?: string;
		showImages?: string;
		headlineFirstPage?: string;
		pricingMode?: string;
	}>;
}) {
	const searchParams = await props.searchParams;

	return (
		<SalesDocumentPreviewPage
			pt={searchParams.pt}
			token={searchParams.token}
			accessToken={searchParams.accessToken}
			snapshotId={searchParams.snapshotId}
			templateId={searchParams.templateId ?? "template-2"}
			pageBreakMode={searchParams.pageBreakMode}
			showImages={searchParams.showImages !== "false"}
			headlineFirstPage={searchParams.headlineFirstPage !== "false"}
			pricingMode={
				searchParams.pricingMode === "customer" ||
				searchParams.pricingMode === "internal"
					? searchParams.pricingMode
					: null
			}
		/>
	);
}
