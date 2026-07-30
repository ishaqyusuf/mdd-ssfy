import { fixUndefinedOrderIdAction } from "@/actions/--fix/fix-undefined-order-id";
import { getSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { prisma } from "@/db";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { FormClient } from "../../_components/form-client";

import PageShell from "@/components/page-shell";
import { resolveSalesFormRequest } from "@/lib/sales-form-routing.server";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	const params = await props.params;
	return constructMetadata({
		title: `Edit Quote | ${params.slug} - gndprodesk.com`,
	});
}
export default async function EditQuotePage(props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const slug = params.slug;
	const routing = await resolveSalesFormRequest({
		currentSurface: "legacy",
		mode: "edit",
		type: "quote",
		slug,
		searchParams,
	});
	await fixUndefinedOrderIdAction(slug, "quote");

	const data = await getSalesBookFormUseCase({
		type: "quote",
		slug: params.slug,
		...searchParams,
	});

	return (
		<PageShell className="">
			<PageTitle>{`Edit Quote | ${data.order.orderId?.toUpperCase()}`}</PageTitle>
			<FormClient
				data={data}
				mode="edit"
				shouldPromptLegacyPreference={routing.shouldPromptLegacyPreference}
			/>
		</PageShell>
	);
}
