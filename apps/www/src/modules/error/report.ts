"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export type ErrorTags = "pdf" | "chromium-aws" | "browserless";
export type ErrorStatus = "severe" | "moderate" | "other";
export async function logError(
    error,
    title,
    status: ErrorStatus,
    tags: ErrorTags[]
) {
    const tagIds = await Promise.all(
        tags.map(async (t) => {
            const r = await prisma.errorTags.upsert({
                where: {
                    name: t,
                },
                create: {
                    name: t,
                },
                update: {},
            });
            return r.id;
        })
    );
    let description = "";
    if (error instanceof Error) description = error.message;
    let data = "";
    try {
        data = JSON.stringify(error);
    } catch (error) {}
    const err = await prisma.errorLog.create({
        data: {
            meta: {},
            status,
            title,
            data,
            description,
            tags: {
                createMany: {
                    data: tagIds.map((tid) => ({
                        errorTagId: tid,
                    })),
                },
            },
            userId: await userId(),
        },
    });
}
