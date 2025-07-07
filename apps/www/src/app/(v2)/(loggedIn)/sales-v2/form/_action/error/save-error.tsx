"use server";

import { sendMessage } from "@/app/(v1)/_actions/email";
import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";
import { DykeForm } from "../../../type";

export async function _saveDykeError(errorId, data) {
    await prisma.dykeSalesError.create({
        data: {
            meta: data,
            errorId: errorId || generateRandomString(4),
            userId: await userId(),
        },
    });
    try {
        await sendMessage({
            body: [
                `Dyke save error`,
                "------- DATA ------",
                JSON.stringify(data),
            ]
                .filter(Boolean)
                .join("\n"),
            subject: `GND: Dyke Save Error`,
            to: `ishaqyusuf024@gmail.com`,
            from: `Noreply <pcruz321@gndprodesk.com>`,
            type: "error",
            parentId: null,
            attachOrder: false,
        } as any);
    } catch (error) {}
}
export async function getErrorData(errorId) {
    const e = await prisma.dykeSalesError.findFirst({
        where: {
            errorId,
        },
    });
    return (e?.meta as any)?.data as DykeForm;
}
export async function errorRestored(errorId) {
    await prisma.dykeSalesError.updateMany({
        where: { errorId },
        data: {
            restoredAt: new Date(),
        },
    });
}
export async function loadDykeErrors() {
    const list = await prisma.dykeSalesError.findMany({
        take: 20,
        orderBy: {
            createdAt: "desc",
        },
    });
    return list.map((l) => {
        return {
            ...l,
            meta: l.meta as any as { message; data: DykeForm; response },
        };
    });
}
export async function _deleteDykeError(errorId) {
    await prisma.dykeSalesError.deleteMany({
        where: {
            errorId,
        },
    });
}
