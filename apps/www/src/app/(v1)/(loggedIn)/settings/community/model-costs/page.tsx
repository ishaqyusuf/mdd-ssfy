import ModelInstallCostModal from "@/app-deps/(v1)/(loggedIn)/settings/community/community-templates/install-cost-modal/model-install-cost-modal";
import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import ModelCostModal from "@/components/_v1/modals/model-cost-modal";
import PageHeader from "@/components/_v1/page-header";
import ModelCostTableShell from "@/components/_v1/shells/model-costs-table-shell";
import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import type { Metadata } from "next";
import { getHomeTemplates } from "../_components/home-template";

import { OpenCommunitModelCostCreateModal } from "@/components/open-community-model-cost-create-modal";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Model Costs",
};
export default async function ModelCosts(props) {
	const searchParams = await props.searchParams;
	const response = await getHomeTemplates(queryParams(searchParams));
	return (
		<PageShell>
			<CommunitySettingsLayoutComponent>
				<Breadcrumbs>
					<BreadLink isFirst title="Settings" />
					<BreadLink title="Community" />
					<BreadLink isLast title="Model Costs" />
				</Breadcrumbs>
				<PageHeader
					title="Model Costs"
					Action={OpenCommunitModelCostCreateModal}
				/>
				<ModelCostTableShell searchParams={searchParams} {...response} />
				<ModelCostModal />
				<ModelInstallCostModal />
			</CommunitySettingsLayoutComponent>
		</PageShell>
	);
}
