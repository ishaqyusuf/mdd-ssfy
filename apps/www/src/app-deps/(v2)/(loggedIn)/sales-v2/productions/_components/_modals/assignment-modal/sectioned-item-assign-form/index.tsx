"use client";

import { useEffect, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useStaticProducers } from "@/_v2/hooks/use-static-data";
import Btn from "@/components/_v1/btn";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { TableCol } from "@/components/common/data-table/table-cells";
import { screens } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useMediaQuery } from "react-responsive";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { useAssignmentData } from "..";
import { createProdAssignment } from "../_action/create-assignment";
import { GetOrderAssignmentData } from "../_action/get-order-assignment-data";
import { useAssignment } from "../use-assignment";
import { useValidateAssignment } from "./validate-assignment";

export interface IAssignGroupForm {
    assignToId?: number;
    prodDueDate;

    doors: {
        [id in string]: GetOrderAssignmentData["doorGroups"][0]["salesDoors"][0]["report"];
    };
}
interface Props {
    index;
    salesDoorIndex?;
}
export function SectionedItemAssignForm({ index, salesDoorIndex = -1 }: Props) {
    const data = useAssignmentData();
    const modal = useAssignment(
        data.data.isProd ? { type: "prod" } : undefined,
    );
    const group = data.data.doorGroups[index];
    const [open, onOpenChange] = useState(false);
    const form = useForm<IAssignGroupForm>({
        defaultValues: {
            doors: {},
            assignToId: -1,
        },
    });

    const prodDueDate = form.watch("prodDueDate");
    const validator = useValidateAssignment(form);
    // async function ÷

    const isMobile = useMediaQuery(screens.xs);
    useEffect(() => {
        if (open) {
            const doors: any = {};
            group?.salesDoors?.map((s, si) => {
                if (
                    (salesDoorIndex >= 0 && si == salesDoorIndex) ||
                    salesDoorIndex < 0
                ) {
                    doors[s.salesDoor?.id?.toString()] = {
                        ...s.report,
                        lhQty: s.report._unassigned?.lh,
                        rhQty: s.report._unassigned?.rh,
                    };
                }
            });
            form.reset({
                doors,
                assignToId: -1,
            });
        }
    }, [open]);
    const prodUsers = useStaticProducers();
    const [saving, startSaving] = useTransition();
    if (!group || data.data.isProd) return null;

    let hands = [
        {
            qty: "lhQty",
            pending: "lhPending",
            title: !group.doorConfig.singleHandle ? "LH" : "Qty",
            handle: "lh",
        },
        !group.doorConfig.singleHandle && {
            qty: "rhQty",
            pending: "rhPending",
            title: group.doorConfig.singleHandle ? "" : "RH",
            handle: "rh",
        },
    ].filter((s) => s) as any;

    async function assign() {
        startSaving(async () => {
            try {
                const _data = validator.validate();
                // let dueDate = form.getValues("prodDueDate");
                if (_data) {
                    const r = await createProdAssignment(
                        _data,
                        // data.data.productionStatus?.id,
                        data.data.totalQty,
                        prodDueDate,
                    );
                    toast.success("Production assigned");
                    modal.open(data.data.id);
                    onOpenChange(false);
                }
            } catch (error) {}
        });
    }
    if (data.data.readOnly) return <></>;
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <Button
                // onClick={() => onOpenChange(!open)}
                asChild
                size={"sm"}
                disabled={
                    salesDoorIndex >= 0
                        ? group.salesDoors[salesDoorIndex]?.report
                              ?.pendingAssignment == 0
                        : group.report.pendingAssignment == 0
                }
                className="h-8 whitespace-nowrap p-2"
            >
                <DropdownMenuTrigger>
                    <span className="hidden sm:inline-block">Assign</span>
                    <span className="mr-2 sm:hidden">
                        <Icons.production className="size-4 " />
                    </span>
                    <span>
                        (
                        {salesDoorIndex >= 0
                            ? group.salesDoors[salesDoorIndex]?.report
                                  ?.pendingAssignment
                            : group.report.pendingAssignment}
                        )
                    </span>
                </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent
                side={isMobile ? "bottom" : "left"}
                className=""
            >
                <Form {...form}>
                    <Card className="w-[100vw]  border-transparent sm:w-[500px]">
                        <CardHeader>
                            <CardTitle>Assign to Production</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-auto sm:max-h-[50vh]">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormSelect
                                    control={form.control}
                                    options={prodUsers.data}
                                    titleKey={"name"}
                                    valueKey="id"
                                    name="assignToId"
                                    label={"Assign To"}
                                />
                                <div className="grid gap-4">
                                    <Label>Due Date</Label>
                                    <DatePicker
                                        className="h-7s w-auto"
                                        value={prodDueDate}
                                        setValue={(v) => {
                                            form.setValue("prodDueDate", v);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 sm:hidden">
                                <div className="">Sections</div>
                                {group.salesDoors
                                    ?.filter(
                                        (s, i) =>
                                            s.report?.pendingAssignment &&
                                            (salesDoorIndex >= 0
                                                ? salesDoorIndex == i
                                                : true),
                                    )
                                    .map((salesDoor, index) => (
                                        <div
                                            className={cn(
                                                "grid grid-cols-2 gap-2 py-2",
                                                index > 0 && "border-t",
                                            )}
                                            key={salesDoor.salesDoor.id}
                                        >
                                            <TableCol.Primary className="col-span-2">
                                                {salesDoor.doorTitle}
                                            </TableCol.Primary>
                                            {hands.map((h) => (
                                                <div
                                                    className="flex items-end"
                                                    key={h.title}
                                                >
                                                    <FormInput
                                                        disabled={
                                                            salesDoor.report
                                                                ._unassigned[
                                                                h.handle
                                                            ] == 0
                                                        }
                                                        control={form.control}
                                                        label={`${h.title} (${
                                                            salesDoor.report
                                                                ._unassigned[
                                                                h.handle
                                                            ]
                                                        })`}
                                                        className=""
                                                        name={
                                                            `doors.${salesDoor.salesDoor.id}._assignForm.${h.qty}` as any
                                                        }
                                                        type="number"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                            <Table className="hidden sm:table">
                                <TableHeader>
                                    <TableHead>Door</TableHead>
                                    {hands?.map((h) => (
                                        <TableHead key={h.title}>
                                            {h.title}
                                        </TableHead>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {group.salesDoors
                                        ?.filter(
                                            (s, i) =>
                                                s.report?.pendingAssignment &&
                                                (salesDoorIndex >= 0
                                                    ? salesDoorIndex == i
                                                    : true),
                                        )
                                        .map((salesDoor) => (
                                            <TableRow
                                                className=""
                                                key={salesDoor.salesDoor.id}
                                            >
                                                <TableCell>
                                                    <TableCol.Primary>
                                                        {salesDoor.doorTitle}
                                                    </TableCol.Primary>
                                                    <TableCol.Secondary>
                                                        {
                                                            salesDoor.salesDoor
                                                                .dimension
                                                        }
                                                    </TableCol.Secondary>
                                                </TableCell>

                                                {hands.map((h) => (
                                                    <TableCell key={h.title}>
                                                        <div className="flex items-center space-x-2">
                                                            <FormInput
                                                                disabled={
                                                                    salesDoor
                                                                        .report
                                                                        ._unassigned[
                                                                        h.handle
                                                                    ] == 0
                                                                }
                                                                control={
                                                                    form.control
                                                                }
                                                                className="w-[80px]"
                                                                name={
                                                                    `doors.${salesDoor.salesDoor.id}._assignForm.${h.qty}` as any
                                                                }
                                                                type="number"
                                                            />
                                                            <span
                                                                className={cn(
                                                                    "whitespace-nowrap",
                                                                    salesDoor
                                                                        .report
                                                                        ._unassigned[
                                                                        h.handle
                                                                    ] == 0 &&
                                                                        "cursor-not-allowed text-muted-foreground",
                                                                )}
                                                            >
                                                                /{" "}
                                                                {
                                                                    salesDoor
                                                                        .report
                                                                        ._unassigned[
                                                                        h.handle
                                                                    ]
                                                                }
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="">
                            <div className="flex w-full justify-end">
                                <Btn
                                    size="sm"
                                    isLoading={saving}
                                    onClick={assign}
                                >
                                    Assign
                                </Btn>
                            </div>
                        </CardFooter>
                    </Card>
                </Form>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
