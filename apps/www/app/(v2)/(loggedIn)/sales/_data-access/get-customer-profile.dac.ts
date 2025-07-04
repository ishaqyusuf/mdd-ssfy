"use server";

// import { ICustomerProfile } from "@/app/(v1)/(loggedIn)/sales/(customers)/customers/profiles/_components/type";
import { prisma } from "@/db";

export async function getCustomerProfileDac(customerId) {
    if (!customerId) return {} as any;
    let profile;
    const customer = await prisma.customers.findUnique({
        where: {
            id: customerId,
        },
        include: {
            profile: true,
        },
    });
    if (customer?.profile) profile = customer?.profile;
    else {
        const defaultProfile = await prisma.customerTypes.findFirst({
            where: {
                defaultProfile: true,
            },
        });
        if (defaultProfile) {
            profile = defaultProfile;
            await prisma.customers.update({
                where: {
                    id: customerId,
                },
                data: {
                    profile: {
                        connect: {
                            id: defaultProfile.id,
                        },
                    },
                },
            });
        }
    }
    return profile as any;
}
