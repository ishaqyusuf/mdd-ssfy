"use server";

import { prisma, Prisma } from "@/db";

export const updateNoteAction = async (id, data: Prisma.NotePadUpdateInput) => {
    await prisma.notePad.update({
        where: {
            id,
        },
        data,
    });
};
