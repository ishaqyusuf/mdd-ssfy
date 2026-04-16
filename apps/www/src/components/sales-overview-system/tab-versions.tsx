"use client";

import type { ReactNode } from "react";

import { SalesOverviewDetailsTabV1 } from "./tabs/details/v1";
import { SalesOverviewDispatchTabV1 } from "./tabs/dispatch/v1";
import { SalesOverviewFinanceTabV1 } from "./tabs/finance/v1";
import { SalesOverviewOverviewTabV1 } from "./tabs/overview/v1";
import { SalesOverviewOverviewTabV2 } from "./tabs/overview/v2";
import { SalesOverviewPackingTabV1 } from "./tabs/packing/v1";
import { SalesOverviewProductionTabV1 } from "./tabs/production/v1";
import { SalesOverviewTransactionsTabV1 } from "./tabs/transactions/v1";
import type { SalesOverviewTabId } from "./types";

export type SalesOverviewTabVersionStatus =
	| "active"
	| "experimental"
	| "legacy";

export type SalesOverviewTabVersionDefinition = {
	content: ReactNode;
	description?: string;
	status?: SalesOverviewTabVersionStatus;
};

type SalesOverviewTabVersionRegistry = Record<
	SalesOverviewTabId,
	{
		defaultVersion: string;
		versions: Record<string, SalesOverviewTabVersionDefinition>;
	}
>;

export const DEFAULT_SALES_OVERVIEW_TAB_VERSIONS: Partial<
	Record<SalesOverviewTabId, string>
> = {
	overview: "v2",
	finance: "v1",
	production: "v1",
	dispatch: "v1",
	packing: "v1",
	transactions: "v1",
	details: "v1",
};

const SALES_OVERVIEW_TAB_VERSION_REGISTRY: SalesOverviewTabVersionRegistry = {
	overview: {
		defaultVersion: "v2",
		versions: {
			v1: {
				content: <SalesOverviewOverviewTabV1 />,
				description: "Legacy overview layout kept for fallback and comparison",
				status: "legacy",
			},
			v2: {
				content: <SalesOverviewOverviewTabV2 />,
				description:
					"Redesigned overview with clearer health signals and section grouping",
				status: "active",
			},
		},
	},
	finance: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewFinanceTabV1 />,
				status: "active",
			},
		},
	},
	production: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewProductionTabV1 />,
				status: "active",
			},
		},
	},
	dispatch: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewDispatchTabV1 />,
				status: "active",
			},
		},
	},
	packing: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewPackingTabV1 />,
				status: "active",
			},
		},
	},
	transactions: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewTransactionsTabV1 />,
				status: "active",
			},
		},
	},
	details: {
		defaultVersion: "v1",
		versions: {
			v1: {
				content: <SalesOverviewDetailsTabV1 />,
				status: "active",
			},
		},
	},
};

export function resolveSalesOverviewTabVersion(tab: SalesOverviewTabId) {
	const registryEntry = SALES_OVERVIEW_TAB_VERSION_REGISTRY[tab];
	const requestedVersion = DEFAULT_SALES_OVERVIEW_TAB_VERSIONS[tab];
	const resolvedVersion =
		(requestedVersion &&
			registryEntry.versions[requestedVersion] &&
			requestedVersion) ||
		registryEntry.defaultVersion;

	return {
		version: resolvedVersion,
		availableVersions: Object.keys(registryEntry.versions),
		...registryEntry.versions[resolvedVersion],
	};
}
