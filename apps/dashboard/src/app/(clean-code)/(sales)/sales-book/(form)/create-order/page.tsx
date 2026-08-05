import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import { createSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { Metadata } from "next";
import { FormClient } from "../_components/form-client";

import PageShell from "@/components/page-shell";
import { resolveSalesFormRequest } from "@/lib/sales-form-routing.server";
import { normalizeSalesFormInitialCustomerId } from "@gnd/sales/sales-form";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { unstable_noStore } from "next/cache";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
	return constructMetadata({
		title: "Create Order - gndprodesk.com",
	});
}

export default async function CreateOrderPage(props) {
	unstable_noStore();
	const searchParams = await props.searchParams;
	const routing = await resolveSalesFormRequest({
		currentSurface: "legacy",
		mode: "create",
		type: "order",
		searchParams,
	});
	const data = await createSalesBookFormUseCase({
		type: "order",
		customerId:
			normalizeSalesFormInitialCustomerId(searchParams.selectedCustomerId) ??
			undefined,
	});
	return (
		<PageShell className="">
			<PageTitle>Create Order</PageTitle>
			<FormClient
				data={data}
				mode="create"
				shouldPromptLegacyPreference={routing.shouldPromptLegacyPreference}
			/>
		</PageShell>
	);
}
