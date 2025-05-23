import z from "zod";

export const createRoleSchema = z.object({
    title: z.string().min(1),
    id: z.number().optional(),
    permissions: z.record(
        z.object({
            permissionId: z.number(),
            checked: z.boolean().optional(),
        }),
    ),
});
