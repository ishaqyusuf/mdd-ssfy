import { getCustomerService } from "@/app-deps/(v1)/_actions/customer-services/crud";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import WorkOrderOverviewSection from "@/components/_v1/work-order/work-order-overview-section";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Customer Service",
	description: "",
};

export default async function CustomerServicePage(props) {
	const params = await props.params;

	const { slug } = params;

	const workOrder = await getCustomerService(slug);
	metadata.description = workOrder?.homeOwner;
	if (!workOrder) return notFound();
	return (
		<PageShell>
			<DataPageShell className="px-8" data={workOrder}>
				<Breadcrumbs>
					<BreadLink
						isFirst
						title="Customer Services"
						link="/customer-services"
					/>
					<BreadLink
						title={`${workOrder?.projectName} ${workOrder?.lot}/${workOrder?.block}`}
					/>
				</Breadcrumbs>
				<div className="grid sm:grid-cols-3 gap-4">
					<div className="sm:col-span-2 flex flex-col space-y-4">
						<WorkOrderOverviewSection />
					</div>
				</div>
			</DataPageShell>
		</PageShell>
	);
}
