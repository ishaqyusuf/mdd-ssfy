"use server";

import { db } from "@gnd/db";

export async function betterAuthAccounts() {
    const count = await db.accounts.count({});
    if (!count) {
        const users = await db.users.findMany({
            where: {},
            select: {
                email: true,
                password: true,
                id: true,
            },
        });
        await db.accounts.createMany({
            data: users.map((u) => ({
                userId: u.id,
                password: u.password,
                providerId: "email-password",
                accountId: u.email,
            })),
        });
    }
}

