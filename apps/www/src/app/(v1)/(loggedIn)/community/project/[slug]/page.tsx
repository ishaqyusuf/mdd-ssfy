import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import { type ExtendedHome, IProject } from "@/types/community";
import type { Metadata } from "next";

import HomesTableShell from "@/app-deps/(v1)/(loggedIn)/community/units/homes-table-shell";
import { getProjectHomesAction } from "@/app-deps/(v1)/_actions/community/home";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Projects",
};
type Props = {};
export default async function ProjectHomesPage(props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const { project, ...response } = (await getProjectHomesAction(
		queryParams({ ...searchParams, _projectSlug: params.slug }),
	)) as any;
	metadata.title = `${project.title} | Homes`;

	return (
		<PageShell>
			<div className="space-y-4 px-8">
				<Breadcrumbs>
					<BreadLink isFirst title="Community" />
					<BreadLink link="/community/projects" title="Projects" />
					<BreadLink link="/community/units" title="All Units" />
					<BreadLink title={project.title} isLast />
				</Breadcrumbs>
				<PageHeader
					title={project.title}
					subtitle={project?.builder?.name}
					modalData={{ projectId: project.id }}
				/>
				<HomesTableShell<ExtendedHome>
					projectView
					data={response.data as any}
					pageInfo={response.pageInfo}
				/>
			</div>
		</PageShell>
	);
}
