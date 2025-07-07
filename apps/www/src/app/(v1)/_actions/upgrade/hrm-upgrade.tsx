"use server";

import { prisma } from "@/db";
import { hash } from "bcrypt-ts";

export async function fixUsersMeta() {
    const _ = await prisma.users.findMany({
        where: {
            meta: {
                not: undefined,
            },
        },
    });
    _.map(async (user) => {
        let meta: any = user.meta as any;
        const { line, trace, message, ...m } = meta;

        if (line || trace || message) {
            await prisma.users.update({
                where: {
                    id: user.id,
                },
                data: {
                    meta: m as any,
                },
            });
        }
    });
    return _;
}
export async function changeIzriEmail() {
    const user = await prisma.users.findFirst({
        where: {
            name: {
                contains: "izri",
            },
        },
    });
    const password = await hash("Millwork", 10);
    if (!user) throw new Error("error");
    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            password,
            email: "izrispam@gmail.com",
        },
    });
    console.log(user);
}
