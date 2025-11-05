import { createPaymentSchema } from "@/actions/schema";
import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { paymentMethods, salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Dialog, Field, Item, Popover, Select } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/custom/icons";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Separator } from "@gnd/ui/separator";
import { useSuspenseQuery } from "@tanstack/react-query";
import React, { Suspense, useEffect, useState } from "react";
import { useFieldArray } from "react-hook-form";
import z from "zod";

interface Props {
    selectedIds: number[];
    phoneNo: string;
    customerId?: number;
    children?;
}

export function SalesPaymentProcessor(props: Props) {
    const [open, setOpened] = useState(false);
    return (
        <Dialog.Root open={open} onOpenChange={setOpened}>
            <Dialog.Trigger asChild>
                {props.children || (
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            setOpened(!open);
                        }}
                        className="w-full"
                    >
                        <Icons.payment className="mr-2 size-4" />
                        Pay
                    </Button>
                )}
            </Dialog.Trigger>
            <Dialog.Content className="w-[450px]">
                <Suspense
                    fallback={
                        <>
                            <Dialog.Title></Dialog.Title>
                            <Dialog.Description></Dialog.Description>
                            <Skeletons.Card />
                        </>
                    }
                >
                    <Content {...props} />
                </Suspense>
            </Dialog.Content>
        </Dialog.Root>
    );
}

function Content(props: Props) {
    const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
    const { data, error, isPending } = useSuspenseQuery(
        _trpc.customers.getCustomerPayPortal.queryOptions({
            accountNo,
        })
    );
    const form = useZodForm(
        createPaymentSchema.merge(
            z.object({
                sales: z.array(
                    z.object({
                        id: z.number(),
                        selected: z.boolean(),
                    })
                ),
            })
        ),
        {
            defaultValues: {},
        }
    );
    useEffect(() => {
        form.reset({
            sales: data.pendingSales.map((s) => ({
                id: s.id,
                selected: props.selectedIds.includes(s.id),
            })),
        });
    }, [data]);
    // const { fields, update } = useFieldArray({
    //     control: form.control,
    //     name: "sales",
    //     keyName: "_id",
    // });
    const wSales = form.watch("sales");
    const pm = form.watch("paymentMethod");
    return (
        <>
            <Dialog.Title>{data?.wallet?.accountNo}</Dialog.Title>
            <Dialog.Description>
                {data?.pendingSales?.[0]?.displayName}
            </Dialog.Description>
            <div className="grid gap-4">
                <Item.Group className="grid grid-cols-2 gap-2">
                    {data?.pendingSales?.map((sale, index) => (
                        <React.Fragment key={sale?.id}>
                            <Item
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    form.setValue(
                                        `sales.${index}.selected`,
                                        !wSales?.[index]?.selected
                                    );
                                }}
                                className={cn(
                                    !wSales?.[index]?.selected ||
                                        "bg-green-300",
                                    "cursor-pointer p-2"
                                )}
                            >
                                <Item.Content className="">
                                    <Item.Title className={cn("text-accents")}>
                                        {sale?.orderId}
                                    </Item.Title>
                                    <Item.Description
                                        className={cn(
                                            "text-secondary-foregrounds flex gap-2 items-center"
                                        )}
                                    >
                                        <span>
                                            {formatDate(sale?.createdAt)}
                                        </span>
                                        {/* <Separator orientation="vertical" /> */}
                                        <>-</>
                                        <span>${sale?.amountDue}</span>
                                    </Item.Description>
                                </Item.Content>
                            </Item>
                        </React.Fragment>
                    ))}
                </Item.Group>
                <Separator />
                <div className="flex items-center gap-2">
                    <div className="flex-1 grid gap-2 grid-cols-2">
                        <Field>
                            <Field.Content>
                                <Select.Root
                                    {...form.register("paymentMethod")}
                                >
                                    <Select.Trigger>
                                        <Select.Value placeholder="Payment Method" />
                                    </Select.Trigger>
                                    <Select.Content>
                                        {salesPaymentMethods.map((s) => (
                                            <Select.Item
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Field.Content>
                        </Field>
                        {pm == "check" ? (
                            <Field>
                                <Field.Content>
                                    <Field.Input
                                        {...form.register("checkNo")}
                                        className=""
                                    />
                                </Field.Content>
                            </Field>
                        ) : pm == "terminal" ? (
                            <Field>
                                <Field.Content>
                                    <Select.Root>
                                        <Select.Trigger>
                                            <Select.Value placeholder="" />
                                        </Select.Trigger>
                                    </Select.Root>
                                </Field.Content>
                            </Field>
                        ) : undefined}
                    </div>
                    <Button className="rounded-full bg-green-500" size="icon">
                        <Icons.arrowRight className="size-4" />
                    </Button>
                </div>
            </div>
        </>
    );
}

