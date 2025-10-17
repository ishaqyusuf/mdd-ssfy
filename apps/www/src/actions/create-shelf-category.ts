"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import z from "zod";

import { actionClient } from "./safe-action";

const schema = z.object({
    name: z.string(),
    type: z.enum(["parent", "child"]).optional(),
    categoryId: z.number().nullable().optional(),
    parentCategoryId: z.number().nullable().optional(),
});
export const createShelfCategoryAction = actionClient
    .schema(schema)
    .metadata({
        name: "create-shelf-category",
    })
    .action(async ({ parsedInput: input }) => {
        input.type = input.parentCategoryId ? "child" : "parent";
        const cat = await prisma.dykeShelfCategories.create({
            data: {
                name: input.name,
                type: input.type,
                categoryId: input.categoryId,
                parentCategoryId: input.parentCategoryId,
            },
        });
        revalidateTag(Tags.shelfCategories);
        return cat;
    });
