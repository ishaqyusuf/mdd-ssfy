import z from "zod";

export const createRoleSchema = z.object({
    title: z.string().min(1),
    id: z.number().optional(),
    permissions: z.record(
        z.object({
            permissionId: z.number(),
            roleId: z.number().nullable().optional(),
            checked: z.boolean().optional(),
        }),
    ),
});
export const createEmployeeProfileSchema = z.object({
    title: z.string().min(1),
    id: z.number().optional(),
    discount: z.number().optional(),
    commission: z.number().optional(),
});
