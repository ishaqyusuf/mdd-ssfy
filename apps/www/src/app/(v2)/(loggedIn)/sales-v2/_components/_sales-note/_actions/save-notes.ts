"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export async function saveNote(data) {
    let {
        type,
        progressableId,
        progressableType,
        headline,
        parentId,
        description,
    } = data;

    const d = await prisma.progress.create({
        data: {
            description,
            headline,
            userId: await userId(),
            type,
            progressableType,
            parentId,
            progressableId,
        },
    });
    return d;
}
