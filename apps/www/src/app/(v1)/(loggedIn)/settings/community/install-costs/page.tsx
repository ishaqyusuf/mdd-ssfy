import { getSettingAction } from "@/app-deps/(v1)/_actions/settings";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { InstallCostForm } from "@/components/_v1/forms/community/install-cost-form";
import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Install Costs",
};
export default async function InstallCostsPage({}) {
	const data = await getSettingAction("install-price-chart");

	return (
		<div className="">
			<PageShell>
				<CommunitySettingsLayoutComponent>
					<Breadcrumbs>
						<BreadLink isFirst title="Settings" />
						<BreadLink title="Community" />
						<BreadLink isLast title="Install Cost" />
					</Breadcrumbs>
					<InstallCostForm data={data as any} />
				</CommunitySettingsLayoutComponent>
			</PageShell>
		</div>
	);
}
