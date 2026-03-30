import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { Shell } from "@/components/shell";
import type { Metadata } from "next";
import { getDykeProducts } from "./_actions/get-dyke-products";
import DykeTabLayout from "./_components/dyke-tab-layout";
import ProductsTable from "./_components/products-table";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Door Components | GND",
};
export default async function ProductsPage(props) {
	const searchParams = await props.searchParams;
	const response = await getDykeProducts(queryParams(searchParams));

	return (
		<PageShell>
			<DykeTabLayout>
				<Breadcrumbs>
					<BreadLink isFirst title="Sales" />
					<BreadLink isLast title="Products" />
				</Breadcrumbs>
				<Shell className="">
					<ProductsTable searchParams={searchParams} {...response} />
				</Shell>
			</DykeTabLayout>
		</PageShell>
	);
}
