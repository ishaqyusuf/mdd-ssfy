"use server";

import { prisma } from "@/db";
import { hashPassword } from "@/app/(v1)/_actions/utils";
import { CreateDealerPasswordSchema } from "./validation";
import { redirect } from "next/navigation";
import { DealerStatus } from "@/app/(v2)/(loggedIn)/sales-v2/dealers/action";

export type VerifyToken = Awaited<ReturnType<typeof verifyToken>>;
export async function verifyToken(token) {
    const t = await prisma.dealerToken.findFirst({
        where: {
            token,
            // expiredAt: {
            //     gt: new Date(),
            // },
        },
        include: {
            auth: true,
        },
    });

    // if(!t)
    // redirect(`/dealer/create-password/${token}/expired`)
    return t;
}
export async function createDealerPassword(data: CreateDealerPasswordSchema) {
    const t = await verifyToken(data.token);
    if (t) {
        await prisma.dealerAuth.update({
            where: {
                id: t.dealerId,
            },
            data: {
                password: await hashPassword(data.password),
                status: "Verified" as DealerStatus,
                emailVerifiedAt: new Date(),
            },
        });
        const u = await prisma.dealerToken.update({
            where: { token: data.token },
            data: {
                consumedAt: new Date(),
            },
        });
        return u;
    }
    // redirect(`/dealer/`);
}
