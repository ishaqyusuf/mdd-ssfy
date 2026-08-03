"use server";

import {
    AddressBookMeta,
    CustomerMeta,
} from "@/app-deps/(clean-code)/(sales)/types";
import { CustomerFormData } from "@/components/forms/customer-form/customer-form";
import { prisma } from "@/db";

type SaleAddressSelection = {
    billingAddressId?: number | null;
    shippingAddressId?: number | null;
};

function mapAddress(address) {
    const addressMeta = address?.meta as any as AddressBookMeta;
    if (!address) return undefined;
    return {
        addressId: address.id,
        address1: address.address1 ?? "",
        address2: address.address2 ?? "",
        city: address.city ?? "",
        country: address.country ?? "",
        formattedAddress: addressMeta?.placeSearchText ?? "",
        lat: addressMeta?.lat,
        lng: addressMeta?.lng,
        placeId: addressMeta?.placeId ?? "",
        state: address.state ?? "",
        zip_code: addressMeta?.zip_code ?? "",
    };
}

export async function getCustomerFormAction(
    id,
    addressId?,
    saleAddresses: SaleAddressSelection = {},
) {
    const saleAddressIds = [
        saleAddresses.billingAddressId,
        saleAddresses.shippingAddressId,
    ].filter((value): value is number => Boolean(value));
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
                    : saleAddressIds.length
                      ? {
                            id: { in: saleAddressIds },
                            deletedAt: null,
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
                take: addressId || !saleAddressIds.length ? 1 : undefined,
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!customer) return null;
    const customerMeta = customer.meta as any as CustomerMeta;
    const [fallbackAddress] = customer.addressBooks;
    const billingAddress = saleAddresses.billingAddressId
        ? customer.addressBooks.find(
              (address) => address.id === saleAddresses.billingAddressId,
          )
        : fallbackAddress;
    const shippingAddress = saleAddresses.shippingAddressId
        ? customer.addressBooks.find(
              (address) => address.id === saleAddresses.shippingAddressId,
          )
        : undefined;
    const address = addressId
        ? fallbackAddress
        : billingAddress || fallbackAddress;

    const addressMeta = address?.meta as any as AddressBookMeta;
    const [taxProfile] = customer?.taxProfiles;
    return {
        addressId: address?.id,
        address1: address?.address1 || customer?.address,
        address2: address?.address2,
        businessName: customer?.businessName,
        city: address?.city,
        country: address?.country,
        customerType: customer.businessName ? "Business" : "Personal",
        email: customer?.email,
        id: customer?.id,
        customerId: customer?.id,
        existingCustomers: [],
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
        addressMeta,
        billingAddress: mapAddress(billingAddress),
        shippingAddress:
            saleAddresses.shippingAddressId === saleAddresses.billingAddressId
                ? mapAddress(billingAddress)
                : mapAddress(shippingAddress),
        shippingSameAsBilling:
            saleAddresses.billingAddressId != null &&
            saleAddresses.shippingAddressId != null &&
            saleAddresses.billingAddressId === saleAddresses.shippingAddressId,
        // addressList: customer?.addressBooks,
    } satisfies CustomerFormData;
}
