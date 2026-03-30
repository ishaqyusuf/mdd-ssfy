import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import type { Metadata } from "next";

import { getBuildersAction } from "@/app-deps/(v1)/(loggedIn)/settings/community/builders/action";
import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import BuildersTableShell from "./builders-table-shell";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Builders",
};
export default async function BuildersPage(props) {
	const searchParams = await props.searchParams;
	const response = await getBuildersAction(queryParams(searchParams));
	return (
		<PageShell>
			<CommunitySettingsLayoutComponent>
				<Breadcrumbs>
					<BreadLink isFirst title="Settings" />
					<BreadLink title="Community" />
					<BreadLink isLast title="Builders" />
				</Breadcrumbs>

				<BuildersTableShell searchParams={searchParams} {...response} />
			</CommunitySettingsLayoutComponent>
		</PageShell>
	);
}
