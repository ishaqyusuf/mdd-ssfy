import "server-only";

import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";

export async function resolveSalesVisibility<T extends Record<string, unknown>>(
	filter: T,
) {
	const profile = await getLoggedInProfile();
	const salesManager = !!profile?.can?.viewSalesManager;

	return {
		salesManager,
		filter: salesManager
			? {
					...filter,
					showing: "all sales" as const,
				}
			: filter,
	};
}
