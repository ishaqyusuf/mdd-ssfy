import { getSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { FormClient } from "../../_components/form-client";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	const params = await props.params;
	return constructMetadata({
		title: `Edit Order | ${params.slug} - gndprodesk.com`,
	});
}
export default async function Page(props) {
	const params = await props.params;
	const slug = params.slug;
	// await fixUndefinedOrderIdAction(slug, "order");
	const data = await getSalesBookFormUseCase({
		type: "order",
		slug: params.slug,
	});
	return (
		<PageShell className="">
			<PageTitle>{`Edit Order | ${data.order.orderId?.toUpperCase()}`}</PageTitle>
			<FormClient data={data} />
		</PageShell>
	);
}
