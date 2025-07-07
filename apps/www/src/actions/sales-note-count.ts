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
                                OR: [
                                    {
                                        tagName: "type",
                                        deletedAt: null,
                                        tagValue: "production",
                                    },
                                    {
                                        tagName: "type",
                                        deletedAt: null,
                                        tagValue: "general",
                                    },
                                ],
                            },
                        },
                    },
                ],
            })),
        },
        select: {
            id: true,
            tags: {
                // take: 1,
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
        const noteCount = notes?.filter(
            (a) => a.tags?.[0]?.tagValue == String(s),
        )?.length;
        if (noteCount)
            resp[String(s)] = {
                noteCount,
            };
    });
    return resp;
}
