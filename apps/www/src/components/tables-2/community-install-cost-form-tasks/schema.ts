import { updateInstallCostSchema } from "@api/schemas/community";
import { z } from "zod";

export const communityInstallCostFormTasksSchema =
	updateInstallCostSchema.extend({
		installCost: z
			.record(z.string(), z.any().optional().nullable())
			.optional()
			.nullable(),
	});

export type CommunityInstallCostFormValues = z.infer<
	typeof communityInstallCostFormTasksSchema
>;
