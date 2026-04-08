"use client";

import React, { useEffect, useState } from "react";
import {
    _getSalesCustomerSystemData,
    GetSalesCustomerSystemData,
} from "@/actions/get-sales-customer-system-data";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

import {
    Combobox,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxLabel,
    ComboboxTrigger,
    useComboboxAnchor,
} from "@gnd/ui/combobox";
import { Label } from "@gnd/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

export default function CustomerProfileUpdateModal({ phoneNo, profileId }) {
    const [data, setData] = useState<GetSalesCustomerSystemData>(null);
    const [_profileId, setProfileId] = useState(profileId);
    const anchor = useComboboxAnchor();
    useEffect(() => {
        _getSalesCustomerSystemData(phoneNo, profileId).then((result) => {
            setData(result);
        });
    }, [phoneNo, profileId]);
    useEffect(() => {}, [profileId]);
    const opened = data?.profileConflicts && profileId && phoneNo;
    if (!opened) return null;
    return null;
    return (
        <Dialog
            open={opened}
            onOpenChange={(e) => {
                setData(null);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Customer Profile</DialogTitle>
                    <DialogDescription>{phoneNo}</DialogDescription>
                </DialogHeader>
                <div className="">
                    <Table>
                        <TableBody>
                            {data.customers?.map((customer) => (
                                <TableRow
                                    className="border-b"
                                    key={customer.id}
                                >
                                    <TableCell>
                                        <p>
                                            {customer.name ||
                                                customer.businessName}
                                        </p>
                                        <Label>
                                            {customer.profile?.title ||
                                                "No Profile Attached"}
                                        </Label>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-end">
                    <Combobox value={_profileId} onValueChange={setProfileId}>
                        <ComboboxLabel>Profile</ComboboxLabel>
                        <ComboboxChips
                            ref={anchor}
                            className="relative min-w-56 pr-9"
                        >
                            <ComboboxChipsInput placeholder="Select Profile..." />
                            <ComboboxTrigger className="absolute right-2 top-1/2 -translate-y-1/2" />
                        </ComboboxChips>
                        <ComboboxContent anchor={anchor}>
                            <ComboboxEmpty>No Profile Found</ComboboxEmpty>
                            {data.profiles?.map((profile) => (
                                <React.Fragment key={profile.id}>
                                    {/* <ComboboxGroup>
                                        <ComboboxGroupLabel>
                                            Profiles
                                        </ComboboxGroupLabel> */}
                                    <ComboboxItem
                                        value={String(profile.id)}
                                    >
                                        {profile.title}
                                    </ComboboxItem>
                                    {/* </ComboboxGroup> */}
                                </React.Fragment>
                            ))}
                        </ComboboxContent>
                    </Combobox>
                </div>
            </DialogContent>
        </Dialog>
    );
}
