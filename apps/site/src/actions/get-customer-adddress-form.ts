"use server";

import {
    AddressBookMeta,
    CustomerMeta,
} from "@/app/(clean-code)/(sales)/types";
import { CustomerFormData } from "@/components/forms/customer-form/customer-form";
import { prisma } from "@/db";

export async function getCustomerAddressForm(id) {
    if (!id) return null;
    const address = await prisma.addressBooks.findUnique({
        where: {
            id,
        },
    });

    const addressMeta = address?.meta as any as AddressBookMeta;

    return {
        addressId: address?.id,
        address1: address?.address1,
        address2: address?.address2,
        // businessName: customer?.businessName,
        city: address?.city,
        country: address?.country,
        // customerType: customer.businessName ? "Business" : "Personal",
        email: address?.email,
        id: address?.id,
        name: address?.name,

        phoneNo: address?.phoneNo,
        phoneNo2: address?.phoneNo2,
        // profileName: customer?.profile?.title,
        state: address?.state,
        zip_code: addressMeta?.zip_code,
    } satisfies CustomerFormData;
}
