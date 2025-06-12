"use server";

import { prisma } from "@/db";

export async function salesNotesCount(salesIds: number[]) {
    const notes = await prisma.notePad.findMany({
        where: {
            deletedAt: null,
            OR: salesIds?.map((v) => ({
                AND: [
                    {
                        tags: {
                            some: {
                                tagName: "salesId",
                                deletedAt: null,
                                tagValue: v?.toString(),
                            },
                        },
                    },
                    {
                        tags: {
                            some: {
                                tagName: "type",
                                deletedAt: null,
                                tagValue: "production",
                            },
                        },
                    },
                ],
            })),
        },
        select: {
            id: true,
            tags: {
                take: 1,
                where: {
                    tagName: "salesId",
                    tagValue: {
                        in: salesIds.map((a) => String(a)),
                    },
                },
                select: {
                    tagValue: true,
                },
            },
        },
    });
    const resp: {
        [id in string]: {
            noteCount?: number;
        };
    } = {};
    salesIds.map((s) => {
        resp[String(s)] = {
            noteCount: notes?.filter((a) => a.tags?.[0]?.tagValue == String(s))
                ?.length,
        };
    });
    return resp;
}
