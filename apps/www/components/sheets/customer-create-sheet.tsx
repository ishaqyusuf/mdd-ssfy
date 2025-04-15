"use client";

import { getCustomerFormAction } from "@/actions/get-customer-form";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import useEffectLoader from "@/lib/use-effect-loader";

import { SheetHeader, SheetTitle } from "@gnd/ui/sheet";

import { CustomerForm } from "../forms/customer-form/customer-form";
import { CustomSheet, CustomSheetContent } from "./custom-sheet-content";

export function CustomerCreateSheet() {
    const { params, setParams } = useCreateCustomerParams();

    const opened = params?.customerForm;
    const customerData = useEffectLoader(
        async () => {
            if (!opened || !params.customerId) return null;
            return await getCustomerFormAction(
                params.customerId,
                params.addressId,
            );
        },
        {
            deps: [opened, params.customerId],
        },
    );
    const cData = customerData?.data;
    if (!opened) return;
    return (
        <CustomSheet
            onOpenChange={(e) => {
                setTimeout(() => {
                    setParams(null);
                }, 500);
            }}
            size="lg"
            rounded
            floating
            open={opened}
        >
            <SheetHeader>
                <SheetTitle>
                    {!!params.customerId ? "Update " : "Create "}Customer
                </SheetTitle>
            </SheetHeader>
            <CustomSheetContent>
                <CustomerForm data={cData} />
            </CustomSheetContent>
        </CustomSheet>
    );
}
