import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import { Shell } from "@/components/shell";
import type { Metadata } from "next";
import { _getProductionList } from "./_components/actions";
import ProductionList from "./_components/production-list";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Sales Productions | GND",
};
export default async function SalesProductionPage(props) {
	const searchParams = await props.searchParams;
	const p = _getProductionList({ query: searchParams });
	const dueToday = _getProductionList({
		query: {
			dueToday: true,
		},
	});
	const pastDue = _getProductionList({
		query: {
			pastDue: true,
		},
	});
	return (
		<PageShell>
			{/* <ProductionPageTabs /> */}
			<Breadcrumbs>
				<BreadLink isFirst title="Sales" />
				<BreadLink title="Productions" isLast />
			</Breadcrumbs>
			<Shell className="px-8">
				<PageHeader title="Due Today" />
				<ProductionList
					emptyText="No Production due today"
					simple
					promise={dueToday}
				/>
				<PageHeader title="Past Due" />
				<ProductionList
					emptyText="No Production past due"
					simple
					promise={pastDue}
				/>
				<PageHeader title="Productions" />
				<ProductionList promise={p} />
			</Shell>
		</PageShell>
	);
}
