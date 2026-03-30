import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageShell from "@/components/page-shell";
import { Shell } from "@/components/shell";
import type { SearchParams } from "@/types";
import type { Metadata } from "next";
import { _getDykeDoors } from "../_actions/dyke-doors";
import DykeTabLayout from "../_components/dyke-tab-layout";
import DykeDoorsTable from "./_components/dyke-doors-table";
export const metadata: Metadata = {
	title: "Shelf Items | GND",
};
interface Props {
	searchParams: Promise<SearchParams>;
}
export default async function DykeDoorsPage(props: Props) {
	const searchParams = await props.searchParams;
	const query = queryParams(searchParams);
	const promise = _getDykeDoors(query);
	return (
		<PageShell>
			<DykeTabLayout>
				<Breadcrumbs>
					<BreadLink isFirst title="Sales" />
					<BreadLink isLast title="Dyke Doors" />
				</Breadcrumbs>
				<Shell className="">
					<DykeDoorsTable promise={promise} />
				</Shell>
			</DykeTabLayout>
		</PageShell>
	);
}
