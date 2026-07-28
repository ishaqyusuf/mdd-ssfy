"use client";

import CommunityInstallCostRate from "@/components/community-install-costs";
import type { TableSettings } from "@/utils/table-settings";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InstallCostsClient({ initialSettings }: Props) {
	return <CommunityInstallCostRate initialSettings={initialSettings} />;
}
