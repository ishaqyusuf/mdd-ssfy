import { SalesDocumentPreviewPage } from "@/components/sales-document-preview-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Document Preview | GND",
	});
}

export default async function Page(props: {
	searchParams: Promise<{
		token?: string;
		accessToken?: string;
		templateId?: string;
	}>;
}) {
	const searchParams = await props.searchParams;

	return (
		<SalesDocumentPreviewPage
			token={searchParams.token}
			accessToken={searchParams.accessToken}
			templateId={searchParams.templateId ?? "template-2"}
		/>
	);
}
