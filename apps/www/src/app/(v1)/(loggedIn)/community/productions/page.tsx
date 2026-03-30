import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { getProductions } from "@/app-deps/(v1)/_actions/community-production/get-productions";
import { _taskNames } from "@/app-deps/(v1)/_actions/community/_task-names";
import CommunityProductionsTableShell from "@/components/_v1/shells/community-productions-table-shell";
import { prisma } from "@/db";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Unit Productions",
};
type Props = {};
export default async function CommunityProductionsPage(props) {
	const searchParams = await props.searchParams;
	const taskNames = await _taskNames({
		produceable: true,
	} as any);

	const response = await getProductions(
		queryParams({ _task: taskNames, ...searchParams }),
	);
	// metadata.title = `${project.title} | Homes`;

	return (
		<PageShell>
			<div className="space-y-4 px-8">
				<Breadcrumbs>
					<BreadLink isFirst title="Community" />
					<BreadLink link="/community/projects" title="Projects" />
					<BreadLink title="Productions" isLast />
				</Breadcrumbs>
				<PageHeader title={"Unit Productions"} subtitle={``} />
				<CommunityProductionsTableShell
					searchParams={searchParams}
					data={response.data as any}
					pageInfo={response.pageInfo}
				/>
			</div>
		</PageShell>
	);
}
