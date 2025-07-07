"use server";

import { paginatedAction } from "@/app/_actions/get-action-utils";
import { prisma } from "@/db";

export type GetMailGridAction = Awaited<ReturnType<typeof getMailGridAction>>;
export async function getMailGridAction(query = {}) {
    const where = {};
    const { pageCount, skip, take } = await paginatedAction(
        {},
        prisma.mailGrids,
        where
    );
    const data = await prisma.mailGrids.findMany({
        where: {},
    });
    return {
        pageCount,
        data,
    };
}
