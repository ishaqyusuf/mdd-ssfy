"use server";

import { MailGrids, prisma } from "@/db";

export async function _createEmailTemplate(data: MailGrids) {
    const e = await prisma.mailGrids.findFirst({
        where: {
            title: data.title,
            type: data.type,
        },
    });
    if (e) throw Error("Template with title already exists");
    await prisma.mailGrids.create({
        data: {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any,
    });
}
