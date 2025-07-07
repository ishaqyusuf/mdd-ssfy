import { z } from "zod";

export const employeeSchema = z.object({
    name: z.string(),
    username: z.string().nullable(),
    email: z.string().email(),
    role: z.object({
        id: z.number(),
    }),
});
export const roleSchema = z.object({
    name: z.string(),
    roleId: z.number().optional(),
    // permission: z.object({}),
});
