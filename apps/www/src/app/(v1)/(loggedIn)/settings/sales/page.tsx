import { getSettingAction } from "@/app-deps/(v1)/_actions/settings";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import type { ISalesSetting } from "@/types/post";
import SalesSettings from "./SalesSettings";

import PageShell from "@/components/page-shell";
export const metadata = {
	title: "Sales Settings",
	description: "",
};
export default async function SalesSettingsPage({ searchParams }) {
	const resp = await getSettingAction<ISalesSetting>("sales-settings");

	if (!resp) return null;
	return (
		<PageShell>
			<div>
				<Breadcrumbs>
					<BreadLink isFirst title="Settings" />
					<BreadLink isLast title="Sales" />
				</Breadcrumbs>
				<SalesSettings data={resp} />
			</div>
		</PageShell>
	);
}
