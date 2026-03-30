import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageShell from "@/components/page-shell";
import { Shell } from "@/components/shell";
import type { SearchParams } from "@/types";
import type { Metadata } from "next";
import { getShelfItems } from "../_actions/get-shelf-items";
import DykeTabLayout from "../_components/dyke-tab-layout";
import ShelfItemsTable from "./_components/shelf-items-table";
export const metadata: Metadata = {
	title: "Shelf Items | GND",
};
interface Props {
	searchParams: Promise<SearchParams>;
}
export default async function ShelfItemsPage(props: Props) {
	const searchParams = await props.searchParams;
	const query = queryParams(searchParams);
	const promise = getShelfItems(query);
	return (
		<DykeTabLayout>
			<Breadcrumbs>
				<BreadLink isFirst title="Sales" />
				<BreadLink isLast title="Shelf Products" />
			</Breadcrumbs>
			<Shell className="">
				<PageShell>
					<ShelfItemsTable promise={promise} />
				</PageShell>
			</Shell>
		</DykeTabLayout>
	);
}
