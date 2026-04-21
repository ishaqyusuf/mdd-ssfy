import type { Prisma } from "@gnd/db";

/**
 * V2 install-cost suggestions should only hide costs that are already attached
 * to the currently selected builder task. Costs used elsewhere on the same
 * model must remain searchable so they can be reused across tasks.
 */
export function buildInstallCostSuggestionsWhere(
	builderTaskId: number,
): Prisma.InstallCostModelWhereInput {
	return {
		status: "active",
		builderTaskInstallCosts: {
			none: {
				builderTaskId,
			},
		},
	};
}
