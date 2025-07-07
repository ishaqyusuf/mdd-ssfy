"use server";

import { prisma } from "@/db";

export async function deleteNoteAction(id) {
    await prisma.notePad.update({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
