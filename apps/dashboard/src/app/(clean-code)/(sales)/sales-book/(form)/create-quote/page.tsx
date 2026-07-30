import { createSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { FormClient } from "../_components/form-client";

import PageShell from "@/components/page-shell";
import { resolveSalesFormRequest } from "@/lib/sales-form-routing.server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { unstable_noStore } from "next/cache";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
	return constructMetadata({
		title: "Create Quote - gndprodesk.com",
	});
}
export default async function CreateOrderPage(props) {
	unstable_noStore();
	const searchParams = await props.searchParams;
	const routing = await resolveSalesFormRequest({
		currentSurface: "legacy",
		mode: "create",
		type: "quote",
		searchParams,
	});
	const data = await createSalesBookFormUseCase({
		type: "quote",
	});

	return (
		<PageShell className="">
			<PageTitle>Create Quote</PageTitle>
			<FormClient
				data={data}
				mode="create"
				shouldPromptLegacyPreference={routing.shouldPromptLegacyPreference}
			/>
		</PageShell>
	);
}
