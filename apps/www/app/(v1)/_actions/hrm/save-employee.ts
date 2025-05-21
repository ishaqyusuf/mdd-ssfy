"use server";

import { prisma } from "@/db";
import { transformData } from "@/lib/utils";
import { IUser } from "@/types/hrm";

import { hashPassword } from "../utils";

export async function createEmployeeAction(data: IUser) {
    const { name, username, email, meta, phoneNo, role } = data;
    const user = await prisma.users.create({
        data: transformData({
            name,
            username,
            phoneNo,
            password: await hashPassword("Millwork"),
            email,
            meta,
        }),
    });
    if (role?.id) {
        const mhr = await prisma.modelHasRoles.create({
            data: {
                roleId: role.id,
                modelId: user.id,
            },
        });
    }

    // await clearCacheAction(
    //     "1099-contractors",
    //     "employees",
    //     "job-employees",
    //     "punchouts"
    // );
}
export async function saveEmployeeAction(data: IUser) {
    const { id, name, createdAt, phoneNo, username, email, meta, role } = data;
    const user = await prisma.users.update({
        where: { id },
        data: transformData({
            name,
            createdAt,
            username,
            phoneNo,
            email,
            meta,
        }),
        include: {
            roles: {
                include: {
                    role: true,
                },
            },
        },
    });
    const roleId = user?.roles[0]?.role?.id;
    if (roleId && role?.id != roleId)
        await prisma.modelHasRoles.updateMany({
            where: {
                modelId: user.id,
            },
            data: {
                roleId: role?.id,
            },
        });
    await prisma.session.deleteMany({
        where: {
            userId: id,
        },
    });
}
export async function resetEmployeePassword(id) {
    await prisma.users.update({
        where: { id },
        data: {
            password: await hashPassword("Millwork"),
        },
    });
    await prisma.session.deleteMany({
        where: {
            userId: id,
        },
    });
}
