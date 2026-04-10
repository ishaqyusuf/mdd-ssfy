"use server";

import { paginatedAction } from "@/app-deps/_actions/get-action-utils";
import { prisma } from "@/db";

type GetMailGridAction = Awaited<ReturnType<typeof getMailGridAction>>;
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
