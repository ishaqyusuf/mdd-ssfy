"use client";

import { getCustomerFormAction } from "@/actions/get-customer-form";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { timeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

import { SheetHeader, SheetTitle } from "@gnd/ui/sheet";

import { CustomerForm } from "../forms/customer-form/customer-form";
import { CustomSheet, CustomSheetContent } from "./custom-sheet-content";

export function CustomerCreateSheet() {
    const { params, setParams, title } = useCreateCustomerParams();

    const opened = params?.customerForm;
    const customerData = useAsyncMemo(async () => {
        if (!opened || !params.customerId) return null;
        await timeout(100);
        // return {
        //     customerId: params?.customerId,
        // };
        const data = await getCustomerFormAction(
            params.customerId,
            params.addressId,
        );
        console.log({ data, params });

        if (params.address) {
            if (params.customerId && !params.addressId) {
                return {
                    id: data?.id,
                    name: data?.name,
                    city: data?.city,
                    country: data?.country,
                    zip_code: data?.zip_code,
                    address1: undefined,
                    phoneNo: undefined,
                    state: data?.state,
                };
            }
        }

        return data;
    }, [opened, params.customerId]);
    if (!opened) return;
    return (
        <CustomSheet
            onOpenChange={(e) => {
                setTimeout(() => {
                    setParams(null);
                }, 100);
            }}
            size="lg"
            rounded
            floating
            open={opened}
        >
            <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <CustomSheetContent>
                <CustomerForm data={customerData} />
            </CustomSheetContent>
        </CustomSheet>
    );
}
