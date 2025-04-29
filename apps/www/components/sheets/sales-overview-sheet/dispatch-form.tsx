"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
    createAssignmentSchema,
    createSalesDispatchItemsSchema,
    createSalesDispatchSchema,
} from "@/actions/schema";
import { SalesDispatchStatus } from "@/app/(clean-code)/(sales)/types";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormSelect from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { cn, generateRandomString, sum } from "@/lib/utils";
import { qtyMatrixDifference } from "@/utils/sales-control-util";
// import type { Dispatch, DispatchItem } from "@/types/dispatch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useController, useForm, useFormContext } from "react-hook-form";
import { NumericFormatProps } from "react-number-format";
import { z } from "zod";

import { Checkbox } from "@gnd/ui/checkbox";
import { Form } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Textarea } from "@gnd/ui/textarea";

import { useDispatch } from "./context";
import { DispatchFormFooter } from "./dispatch-form-footer";

const availableItems: any[] = [
    { id: "ITEM-001", name: "Product A", availableQty: 100, dispatchQty: 0 },
    { id: "ITEM-002", name: "Product B", availableQty: 75, dispatchQty: 0 },
    { id: "ITEM-003", name: "Product C", availableQty: 200, dispatchQty: 0 },
    { id: "ITEM-004", name: "Product D", availableQty: 50, dispatchQty: 0 },
    { id: "ITEM-005", name: "Product E", availableQty: 150, dispatchQty: 0 },
    { id: "ITEM-006", name: "Product F", availableQty: 80, dispatchQty: 0 },
];

interface DispatchFormProps {
    dispatch?: any;
    onSubmit?: (values: any) => void;
    onCancel?: () => void;
}

export function DispatchForm({ dispatch, onSubmit }: DispatchFormProps) {
    const ctx = useDispatch();
    const [selectedItems, setSelectedItems] = useState<any[]>(
        dispatch?.items || [],
    );
    const [allSelected, setAllSelected] = useState(false);
    const { form, formSchema } = useDispatch();

    useEffect(() => {
        if (ctx.data) {
            const items: z.infer<typeof formSchema>["itemData"]["items"] = {};

            ctx.data.dispatchables.map((item) => {
                items[item.uid] = {
                    available: item.availableQty,
                    qty: {
                        ...item.availableQty,
                    },
                    orderItemId: item.itemId,
                    itemUid: item.uid,
                    totalItemQty: item.totalQty,
                };
            });
            form.reset({
                delivery: {
                    deliveryMode: "delivery",
                    deliveryDate: new Date(),
                    status: "queue",
                },
                itemData: {
                    orderId: ctx.data.id,
                    items,
                },
            });
        }
    }, [ctx.data]);
    const packingList = form.watch("delivery.packingList");

    return (
        <Form {...form}>
            <form
                // onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <div className="grid grid-cols-2 items-end gap-4">
                    <DatePicker
                        control={form.control}
                        name="delivery.deliveryDate"
                        size="sm"
                        label="Dispatch Date"
                    />
                    <FormSelect
                        size="sm"
                        options={ctx?.drivers || []}
                        label={"Assign To"}
                        name="delivery.driverId"
                        control={form.control}
                        placeholder="Select Driver"
                        titleKey="name"
                        valueKey="id"
                    />

                    <FormSelect
                        label="Dispatch Mode"
                        control={form.control}
                        name="delivery.deliveryMode"
                        options={["pickup", "delivery"]}
                    />
                    <FormSelect
                        label="Dispatch Status"
                        control={form.control}
                        name="delivery.status"
                        options={
                            [
                                "queue",
                                "in progress",
                                "completed",
                            ] as SalesDispatchStatus[]
                        }
                    />
                    <div className="col-span-2">
                        <FormCheckbox
                            control={form.control}
                            name="delivery.packingList"
                            label="Packing List"
                        />
                    </div>
                    <div className={cn("col-span-2", !packingList && "hidden")}>
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-medium">
                                Prepare Packing List
                            </h4>
                        </div>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Packing Qty</TableHead>
                                        {/* <TableHead>Dispatch Qty</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ctx?.data?.dispatchables?.map((item) => (
                                        <TableRow key={item.uid}>
                                            <TableCell>
                                                <TCell.Primary>
                                                    {item.title}
                                                </TCell.Primary>
                                                <TCell.Secondary className="uppercase">
                                                    {item.subtitle}
                                                </TCell.Secondary>
                                            </TableCell>
                                            <TableCell>
                                                <div className="inline-flex gap-4">
                                                    {item.availableQty.lh ||
                                                    item.availableQty.rh ? (
                                                        <>
                                                            <QtyInput
                                                                itemUid={
                                                                    item.uid
                                                                }
                                                                name="lh"
                                                            />
                                                            <QtyInput
                                                                itemUid={
                                                                    item.uid
                                                                }
                                                                name="rh"
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <QtyInput
                                                                itemUid={
                                                                    item.uid
                                                                }
                                                                name="qty"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
                <DispatchFormFooter />
            </form>
        </Form>
    );
}
function QtyInput({
    className,
    name,
    itemUid,
    // label,
    ...props
}: Omit<NumericFormatProps, "value" | "onChange"> & {
    name: "lh" | "rh" | "qty";
    itemUid;
    // label: string;
}) {
    const { control, getValues } = useFormContext();
    const pendingQty = getValues(`itemData.items.${itemUid}.available.${name}`);
    const {
        field: { value, onChange, onBlur },
    } = useController({
        name: `itemData.items.${itemUid}.qty.${name}`,
        control,
    });
    return (
        <div className="">
            <NumberInput
                onValueChange={(e) => {
                    let value = e.floatValue || null;
                    onChange(value, { shouldValidate: true });
                }}
                value={value}
                disabled={!pendingQty}
                max={2}
                className="w-20 rounded-none"
                placeholder={`0/${pendingQty} ${name?.toUpperCase()}`}
                suffix={`/${pendingQty} ${name?.toUpperCase()}`}
                {...props}
            />
        </div>
    );
}
