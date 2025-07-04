"use server";

import { saveCustomerDta } from "@/app/(clean-code)/(sales)/_common/data-access/customer.dta";
import { sessionIsDealerMode, user } from "@/app/(v1)/_actions/utils";

import { CustomerTypes, prisma, Prisma } from "@/db";
import { nextId } from "@/lib/nextId";
import { ICustomer } from "@/types/customers";
import { IAddressBook, ISalesAddressForm } from "@/types/sales";

import { getCustomerProfileDac } from "./get-customer-profile.dac";
import { ICustomerProfile } from "@/app/(clean-code)/(sales)/types";
export async function _saveSalesAddress({
    billingAddress,
    shippingAddress,
    // profile,
    sameAddress,
    customer: _customer,
}: ISalesAddressForm) {
    const dealer = await sessionIsDealerMode();

    const response: {
        customerId?;
        customer?;
        billingAddressId?;
        shippingAddressId?;
        shippingAddress?;
        billingAddress?;
        profile: ICustomerProfile;
    } = {} as any;
    function setAddress(index, addr) {
        if (index == 0) {
            if (sameAddress) response.shippingAddress = addr;
            response.billingAddress = addr;
        } else {
            response.shippingAddress = addr;
        }
    }
    const customer = await saveCustomerDta({
        phoneNo: billingAddress.phoneNo,
        phoneNo2: billingAddress.phoneNo2,
        email: billingAddress.email,
        name: billingAddress.name,
        address: billingAddress.address1,
        businessName: _customer.businessName,
    });
    response.customerId = customer.id;
    response.customer = customer;
    await Promise.all(
        [billingAddress, shippingAddress].map(async (_address, index) => {
            if (sameAddress && index == 1) return;
            let { id, ...address } = _address;
            let newId = null;

            const { phoneNo, phoneNo2, email, name, address1 } = address as any;
            address.customerId = customer?.id;
            function _or(k: keyof Prisma.AddressBooksWhereInput, value) {
                return {
                    OR: [
                        {
                            [k]: value,
                        },
                        {
                            [k]: null,
                        },
                    ],
                };
            }
            const where: Prisma.AddressBooksWhereInput = {
                AND: [
                    { name },
                    _or("phoneNo", phoneNo),
                    _or("email", email),
                    _or("address1", address1),
                    {
                        customer: dealer
                            ? {
                                  auth: {
                                      id: dealer.id,
                                  },
                              }
                            : {
                                  isNot: null,
                              },
                    },
                ],
            };
            let eAddr = (await prisma.addressBooks.findFirst({
                where,
                include: {
                    customer: {
                        include: {
                            auth: true,
                        },
                    },
                },
            })) as any as IAddressBook | null;

            if (eAddr) {
                let _update: any = null;
                const columns: (keyof IAddressBook)[] = [
                    "email",
                    "city",
                    "state",
                    "address1",
                ];
                if (
                    eAddr.address1 &&
                    address.address1 &&
                    eAddr.address1 != address.address1
                ) {
                    eAddr = null;
                } else {
                    columns.map((c) => {
                        let nac = address?.[c];
                        if (nac) {
                            if (!_update) _update = {};
                            _update[c] = nac;
                        }
                    });
                    if (address?.meta?.zip_code)
                        _update.meta = {
                            ...(eAddr.meta ?? {}),
                            zip_code: address?.meta?.zip_code,
                        };
                    setAddress(index, eAddr);
                    if (_update) {
                        const _adr = await prisma.addressBooks.update({
                            where: {
                                id: eAddr.id,
                            },
                            data: _update,
                        });
                        setAddress(index, _adr);
                    }
                    newId = eAddr.id as any;
                }
            }
            if (eAddr == null) {
                const addr = await prisma.addressBooks.create({
                    data: {
                        ...(address as any),
                    },
                });
                newId = addr.id as any;

                setAddress(index, addr);
            }
            if (index == 0) {
                response.billingAddressId = newId;

                if (sameAddress) response.shippingAddressId = newId;
            } else response.shippingAddressId = newId;
        }),
    );
    response.profile = await getCustomerProfileDac(response.customerId);
    return response;
}
