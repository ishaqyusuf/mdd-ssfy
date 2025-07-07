"use server";
import { prisma } from "@/db";
import { ICustomer } from "@/types/customers";

import { transformData } from "@/lib/utils";
import { getCustomerProfileId } from "../(customers)/_actions/sales-customers";

export async function updateCustomerAction(data: ICustomer) {
    // const { id, primaryAddress, profile, addressBooks } = data;
    const customerTypeId = await getCustomerProfileId(data);

    const { email, businessName, name, meta, address, phoneNo } = data;
    const { id: paId, ...primaryAddress } = data.primaryAddress;
    let primaryAddressId = paId;
    if (!paId) {
        const addr = await prisma.addressBooks.create({
            data: transformData({
                ...primaryAddress,
                customerId: data.id,
            }) as any,
        });
        primaryAddressId = addr.id;
    } else {
        await prisma.addressBooks.update({
            where: { id: primaryAddressId },
            data: {
                ...(transformData(
                    {
                        ...primaryAddress,
                        name: businessName || name,
                        phoneNo,
                    },
                    true
                ) as any),
            },
        });
    }
    await prisma.customers.update({
        where: {
            id: data.id,
        },
        data: {
            ...transformData({
                addressId: primaryAddressId,
                email,
                name,
                businessName,
                meta,
                address: primaryAddress.address1,
                phoneNo,
            }),
            profile: customerTypeId
                ? {
                      connect: {
                          id: Number(customerTypeId),
                      },
                  }
                : undefined,
        },
    });
}
