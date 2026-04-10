"use server";

import { _cache } from "@/app-deps/(v1)/_actions/_cache/load-data";
import { CustomerTypes, prisma } from "@/db";
import { transformData } from "@/lib/utils";

async function staticCustomerProfilesAction() {
    return await prisma.customerTypes.findMany({});
}

async function saveCustomerProfile(data: CustomerTypes) {
    const { id, ...rest } = data;
    if (!id)
        await prisma.customerTypes.create({
            data: transformData(rest) as any,
        });
    else
        await prisma.customerTypes.update({
            where: { id },
            data: transformData(rest) as any,
        });
}
async function setCustomerProfileAction(id, profileId) {
    await prisma.customers.update({
        where: {
            id,
        },
        data: {
            profile: {
                connect: {
                    id: profileId,
                },
            },
        },
    });
}
export async function setDefaultCustomerProfile(id) {
    if (!id) return;
    await prisma.customerTypes.updateMany({
        where: {
            defaultProfile: true,
        },
        data: {
            defaultProfile: false,
        },
    });
    await prisma.customerTypes.update({
        where: { id },
        data: { defaultProfile: true },
    });
}
