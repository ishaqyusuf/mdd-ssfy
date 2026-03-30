import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { getHomeInvoices } from "@/app-deps/(v1)/_actions/community-invoice/get-invoices";
import EditInvoiceModal from "@/components/_v1/modals/edit-invoice-modal";
import CommunityInvoiceTableShell from "@/components/_v1/shells/community-invoice-table-shell";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "All Unit Invoices",
};
type Props = {};
export default async function InvoicesPage(props) {
	const searchParams = await props.searchParams;
	const response = await getHomeInvoices(queryParams({ ...searchParams }));
	// metadata.title = `${project.title} | Homes`;

	return (
		<PageShell>
			<div className="space-y-4 px-8">
				<Breadcrumbs>
					<BreadLink isFirst title="Community" />
					<BreadLink link="/community/projects" title="Projects" />
					<BreadLink link="/community/invoices" title="All Invoices" isLast />
				</Breadcrumbs>
				<PageHeader title={"Unit Invoices"} subtitle={``} />
				<CommunityInvoiceTableShell
					projectView={false}
					searchParams={searchParams}
					data={response.data as any}
					pageInfo={response.pageInfo}
				/>
				<EditInvoiceModal />
			</div>
		</PageShell>
	);
}
