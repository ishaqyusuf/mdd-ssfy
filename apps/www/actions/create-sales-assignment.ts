"use server";

import { prisma, Prisma } from "@/db";

import { actionClient } from "./safe-action";
import { createAssignmentSchema } from "./schema";

export const createSalesAssignmentAction = actionClient
    .schema(createAssignmentSchema)
    .metadata({
        name: "create-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: { ...input } }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {});
        return resp;
    });
