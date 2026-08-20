import type { TRPCContext } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "./operational-route-access";

export async function requireWorkflowComponentEditor(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["editSalesComponent"],
		"You do not have permission to manage workflow components.",
	);
}
