"use server";

import {
    AddressBookMeta,
    CustomerMeta,
} from "@/app/(clean-code)/(sales)/types";
import { CustomerFormData } from "@/components/forms/customer-form/customer-form";
import { prisma } from "@/db";

export async function getCustomerFormAction(id, addressId?) {
    const customer = await prisma.customers.findFirst({
        where: {
            id,
        },
        include: {
            taxProfiles: {
                select: {
                    taxCode: true,
                    id: true,
                },
            },
            profile: true,
            addressBooks: {
                where: addressId
                    ? {
                          id: addressId,
                      }
                    : {
                          OR: [
                              // {
                              //     id: shippingId,
                              // },
                              {
                                  isPrimary: true,
                              },
                              {
                                  AND: [
                                      {
                                          isPrimary: false,
                                      },
                                  ],
                              },
                          ],
                      },
                take: 1,
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    const customerMeta = customer?.meta as any as CustomerMeta;
    const [address] = customer?.addressBooks;
    const addressMeta = address?.meta as any as AddressBookMeta;
    const [taxProfile] = customer?.taxProfiles;
    return {
        addressId: address?.id,
        address1: customer?.address,
        address2: address?.address2,
        businessName: customer?.businessName,
        city: address?.city,
        country: address?.country,
        customerType: customer.businessName ? "Business" : "Personal",
        email: customer?.email,
        id: customer?.id,
        name: customer?.name,
        netTerm: customerMeta?.netTerm,
        phoneNo: customer?.phoneNo,
        phoneNo2: address?.phoneNo2,
        // profileName: customer?.profile?.title,
        profileId: customer?.customerTypeId
            ? String(customer?.customerTypeId)
            : undefined,
        state: address?.state,
        zip_code: addressMeta?.zip_code,
        taxCode: taxProfile?.taxCode,
        taxProfileId: taxProfile?.id,
    } satisfies CustomerFormData;
}
