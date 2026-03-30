import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import { type ExtendedHome, IProject } from "@/types/community";
import type { Metadata } from "next";

import HomesTableShell from "@/app-deps/(v1)/(loggedIn)/community/units/homes-table-shell";
import { getHomesAction } from "@/app-deps/(v1)/_actions/community/home";
import { _addLotBlocks } from "@/app-deps/(v1)/_actions/community/units/_add-lotblocks";
import ActivateProductionModal from "@/components/_v1/modals/activate-production-modal";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "All Units",
};
type Props = {};
export default async function CommunityUnitsPage(props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const response = await getHomesAction(
		queryParams({ ...searchParams, _projectSlug: params.slug }),
	);
	await _addLotBlocks();

	// metadata.title = `${project.title} | Homes`;

	return (
		<PageShell>
			<div className="space-y-4 px-8">
				<Breadcrumbs>
					<BreadLink isFirst title="Community" />
					<BreadLink link="/community/projects" title="Projects" />
					<BreadLink link="/community/units" title="All Units" isLast />
				</Breadcrumbs>
				<PageHeader title={"Units"} subtitle={``} />
				<HomesTableShell<ExtendedHome>
					projectView={false}
					data={response.data as any}
					searchParams={searchParams}
					pageInfo={response.pageInfo}
				/>
				<ActivateProductionModal />
			</div>
		</PageShell>
	);
}
