"use server";

import { user } from "@/app-deps/(v1)/_actions/utils";
import { db } from "@gnd/db";

export async function betterAuthAccounts() {
    const count = await db.account.count({});
    if (!count) {
        const users = await db.users.findMany({
            where: {},
            select: {
                email: true,
                password: true,
                id: true,
            },
        });
        await Promise.all(
            users.map(async (u) => {
                await db.account.create({
                    data: {
                        user: {
                            create: {
                                // userId: u.id
                                user: {
                                    connect: {
                                        id: u.id,
                                    },
                                },
                            },
                        },
                        password: u.password,
                        providerId: "email-password",
                        accountId: u.email,
                    },
                });
            })
        );
        // await db.account.createMany({
        //     data: users.map((u) => ({
        //         userId: u.id,
        //         password: u.password,
        //         providerId: "email-password",
        //         accountId: u.email,
        //     })),
        // });
    }
}

