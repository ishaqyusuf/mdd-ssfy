"use server";

import { prisma } from "@/db";

export async function getNoteSuggestionsAction(tagFilterKeys) {
    const notes = await prisma.notePad.findMany({
        where: {
            AND: [
                {
                    tags: {
                        some: {
                            OR: tagFilterKeys.map((k) => ({
                                tagName: k,
                            })),
                        },
                    },
                },
            ],
        },
        distinct: "note",
    });
    return notes.map((note) => note.note);
}
