import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import HomeTemplatesTableShell from "@/components/_v1/shells/home-templates-table-shell";
import { getHomeTemplates } from "../_components/home-template";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Builders",
};
export default async function ModelTemplatesPage(props) {
	const searchParams = await props.searchParams;
	const response = await getHomeTemplates(queryParams(searchParams));
	return (
		<PageShell>
			<CommunitySettingsLayoutComponent>
				<Breadcrumbs>
					<BreadLink isFirst title="Settings" />
					<BreadLink title="Community" />
					<BreadLink isLast title="Model Templates" />
				</Breadcrumbs>
				<PageHeader
					title="Model Templates"
					// newDialog="modelTemplate"
				/>
				<HomeTemplatesTableShell searchParams={searchParams} {...response} />
				{/* <ModelTemplateModal /> */}
			</CommunitySettingsLayoutComponent>
		</PageShell>
	);
}
