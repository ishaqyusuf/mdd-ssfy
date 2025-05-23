"use server";
import z from "zod";
import { createEmployeeProfileSchema, createRoleSchema } from "./schema.hrm";
import { actionClient } from "./safe-action";
import { prisma } from "@/db";
import { revalidateTag } from "next/cache";

export type CreateEmployeeProfile = z.infer<typeof createEmployeeProfileSchema>;

export async function createRole(data: CreateEmployeeProfile) {
    if (data.id) {
        await prisma.roles.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.title,
            },
        });
    } else {
        data.id = (
            await prisma.roles.create({
                data: {
                    name: data.title,
                },
            })
        ).id;
    }

    revalidateTag(`employee-profiles`);
    // revalidateTag(`role_${data.id}`);
}
export const createRoleAction = actionClient
    .schema(createRoleSchema)
    .action(async ({ parsedInput: data }) => {
        // return await transaction(async (tx) => {
        const resp = await createRole(data);
        return resp;
        // });
    });
