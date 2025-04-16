"use client";

import { useState } from "react";
import { getCustomerFormAction } from "@/actions/get-customer-form";
import { updateCustomerProfile } from "@/actions/update-customer-profile";
import { updateCustomerTax } from "@/actions/update-customer-tax";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { generateRandomString } from "@/lib/utils";
import { useAsyncMemo } from "use-async-memo";

import { AlertTitle } from "@gnd/ui/alert";
import { AlertDialog, AlertDialogContent } from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Label } from "@gnd/ui/label";

export function CustomerProfileTaxUpdatePrompt({}) {
    const zus = useFormDataStore();
    const customerId = zus.metaData?.cad;
    const profileId = zus.metaData?.salesProfileId;
    const taxCode = zus.metaData?.pricing?.taxCode;

    const data = useAsyncMemo(async () => {
        let updates = [];
        if (customerId) {
            const form = await getCustomerFormAction(customerId);
            if (profileId != Number(form?.profileId)) {
                if (!form.profileId) {
                    await updateCustomerProfile(customerId, profileId);
                } else
                    updates.push({
                        note: "Selected customer profile on this sale does not match with customer profile on the record.",
                        code: generateRandomString(5),
                        update: async () =>
                            await updateCustomerProfile(customerId, profileId),
                    });
            }
            if (taxCode != form?.taxCode) {
                if (!form.taxProfileId)
                    await updateCustomerTax(customerId, taxCode);
                else {
                    updates.push({
                        note: "Selected customer tax on this sale does not match with customer tax on the record.",
                        code: generateRandomString(5),
                        update: async () =>
                            await updateCustomerProfile(customerId, profileId),
                    });
                }
            }
        }
        return updates;
    }, [customerId, profileId, taxCode]);
    const [resolved, setResolved] = useState<{
        [code in string]: { note: string };
    }>({});
    const opened =
        data?.some((data) => !resolved[data?.code]) && !!data?.length;
    return (
        <Dialog
            open={opened}
            onOpenChange={(e) => {
                const __ = {};
                data?.map((a) => (__[a.code] = { note: "not updated" }));
                setResolved(__);
            }}
        >
            <DialogContent>
                <DialogTitle>Customer Profile Changed</DialogTitle>
                <DialogDescription></DialogDescription>

                {data?.map((d) => (
                    <div key={d.code} className="border-b py-2">
                        <Label>
                            {d.note}
                            {resolved?.[d.code] ? (
                                <>
                                    <span className="">
                                        {resolved?.[d.code]?.note}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={async (e) => {
                                            await d.update();
                                            setResolved((r) => {
                                                return {
                                                    ...r,
                                                    [d.code]: {
                                                        note: "Updated",
                                                    },
                                                };
                                            });
                                        }}
                                        size="xs"
                                        variant="link"
                                    >
                                        Update Customer
                                    </Button>
                                    <Button
                                        onClick={(e) => {
                                            setResolved((r) => {
                                                return {
                                                    ...r,
                                                    [d.code]: {
                                                        note: "customer not updated",
                                                    },
                                                };
                                            });
                                        }}
                                        size="xs"
                                        className="text-red-600 hover:text-red-500"
                                        variant="link"
                                    >
                                        Do not update
                                    </Button>
                                </>
                            )}
                        </Label>
                    </div>
                ))}
            </DialogContent>
        </Dialog>
    );
}
