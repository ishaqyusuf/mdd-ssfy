import type { SalesFormResponse } from "@/app-deps/(v1)/(loggedIn)/sales/_actions/sales-form";
import { _getSalesFormAction } from "@/app-deps/(v1)/(loggedIn)/sales/_actions/get-sales-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import PageShell from "@/components/page-shell";
import {
	BreadLink,
	OrderViewCrumb,
	OrdersCrumb,
} from "@/components/_v1/breadcrumbs/links";
import type { Metadata } from "next";
import EditSalesForm from "@/app-deps/(v2)/(loggedIn)/sales/edit/components/form";
export const metadata: Metadata = {
	title: "Edit Sales | GND",
};
export default async function EditSalesPage(props) {
	const params = await props.params;
	const { type, slug } = params;
	const resp: SalesFormResponse = await _getSalesFormAction({
		orderId: slug,
		type,
	});

	const title = [
		`${resp.form.id ? "Edit" : "New"} ${type}`,
		resp.form.id && slug,
	]
		.filter(Boolean)
		.join(": ");
	// if (!resp.form.deliveryOption) resp.form.deliveryOption = "pickup";
	const orderId = resp?.form?.orderId;
	metadata.title = title;
	const suppliers = resp.form?.items?.map((item) => item.supplier) || [];
	resp.ctx.suppliers = [...new Set([...resp.ctx.suppliers, ...suppliers])];
	return (
		<div id="salesEditPage">
			<PageShell>
				<Breadcrumbs>
					<OrdersCrumb isFirst />
					{orderId && <OrderViewCrumb slug={orderId} />}
					<BreadLink title={orderId ? "Edit" : "New"} isLast />
				</Breadcrumbs>
				<EditSalesForm data={resp} />
			</PageShell>
		</div>
	);
}
