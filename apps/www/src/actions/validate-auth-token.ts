import { prisma } from "@/db";
import dayjs from "dayjs";

const EMAIL_TOKEN_LOGIN_EXPIRY_MINUTES = 10;

export async function validateAuthToken(id) {
    const token = await prisma.emailTokenLogin.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            createdAt: true,
            userId: true,
        },
    });
    const user = await prisma.users.findUnique({
        where: {
            id: token?.userId,
        },
        select: {
            id: true,
            email: true,
        },
    });
    const createdAt = token.createdAt;
    const createdAgo = dayjs().diff(createdAt, "minutes");

    if (createdAgo > EMAIL_TOKEN_LOGIN_EXPIRY_MINUTES)
        return {
            status: "Expired",
        };
    return {
        email: user.email,
    };
}
