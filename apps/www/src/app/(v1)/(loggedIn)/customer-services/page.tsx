import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { IProject } from "@/types/community";
import type { Metadata } from "next";

import { getCustomerServices } from "@/app-deps/(v1)/_actions/customer-services/customer-services";
import CustomerServiceTableShell from "@/components/_v1/shells/customer-service-table-shell";
import { OpenWorkOrderFormModal } from "@/components/open-work-order-form-modal";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Customer Services",
};
type Props = {};
export default async function OrdersPage(props) {
	const searchParams = await props.searchParams;
	const response = await getCustomerServices(queryParams(searchParams));

	return (
		<PageShell>
			<div className="space-y-4 px-8">
				<Breadcrumbs>
					<BreadLink isFirst title="Customer Services" />
				</Breadcrumbs>
				<PageHeader
					title="Customer Services"
					// newDialog="customerServices"
					Action={OpenWorkOrderFormModal}
				/>
				<CustomerServiceTableShell<IProject>
					searchParams={searchParams}
					{...response}
				/>
				{/* <CustomerServiceModal /> */}
			</div>
		</PageShell>
	);
}
