"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { _readyForDelivery } from "@/app/(v1)/(loggedIn)/sales/_actions/delivery/ready-for-delivery";
import { _startSalesDelivery } from "@/app/(v1)/(loggedIn)/sales/_actions/delivery/start-sales-delivery";
import { _createBackorder } from "@/app/(v2)/(loggedIn)/sales/_actions/create-back-order";
import Btn from "@/components/_v1/btn";
import { TruckLoaderForm } from "@/components/_v1/sales/load-delivery/load-delivery";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import { IBackOrderForm, ISalesOrder } from "@/types/sales";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import BaseModal from "../base-modal";

export default function InspectBackOrderModal() {
    const [pending, startTransition] = useTransition();
    const form = useForm<TruckLoaderForm>({
        defaultValues: {},
    });
    async function save(order: TruckLoaderForm) {
        startTransition(async () => {
            // console.log(order);
            const _o = form.getValues();
            if (_o.action == "ready") {
                await _readyForDelivery(_o);
                toast.success("Ready For Delivery!");
            } else if (_o.action == "load") {
                console.log(await _startSalesDelivery(_o));
                // closeModal();
                toast.success("Backorder created!");
            } else {
                console.log(await _createBackorder(_o));
                // closeModal();
                toast.success("Backorder created!");
            }
        });
    }
    const [currentTab, setCurrentTab] = useState<string>();
    const [checkAll, setCheckAll] = useState(false);

    const [title, setTitle] = useState("");
    const [slugs, setSlugs] = useState([]);

    return (
        <BaseModal<TruckLoaderForm>
            className="sm:max-w-[650px]"
            onOpen={(order) => {
                // console.log(order);
                form.reset(order);
                const slug = Object.entries(order.loader)
                    .map(([slug, v]) => (v.hasBackOrder ? slug : null))
                    .filter(Boolean)?.[0];
                setCurrentTab(slug as any);
            }}
            onClose={() => {}}
            modalName="inspectBackOrder"
            Title={({ data: order }) => (
                <div className="">Inspect Back Order</div>
            )}
            Footer={({ data }) => (
                <>
                    <Btn isLoading={pending} onClick={() => save(data as any)}>
                        Proceed
                    </Btn>
                </>
            )}
            Subtitle={({ data }) => (
                <div>
                    All items not loaded fully are backorders, click on other
                    items you wish to add to backorder.
                </div>
            )}
            Content={({ data }) =>
                data && (
                    <Form {...form}>
                        <div className="">
                            <Tabs defaultValue={currentTab}>
                                <TabsList className="">
                                    {Object.entries(data.loader).map(
                                        ([slug, l]) =>
                                            l.hasBackOrder && (
                                                <TabsTrigger
                                                    key={slug}
                                                    className="flex flex-col"
                                                    value={slug}
                                                >
                                                    <div className="">
                                                        <p>{slug}</p>
                                                    </div>
                                                </TabsTrigger>
                                            ),
                                    )}
                                </TabsList>
                                <ScrollArea className="h-[50vh]">
                                    {Object.entries(data.loader).map(
                                        ([slug, l]) =>
                                            l.hasBackOrder && (
                                                <TabsContent
                                                    key={slug}
                                                    className="flex flex-col"
                                                    value={slug}
                                                >
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="px-2">
                                                                    Items
                                                                </TableHead>
                                                                {/* <TableHead className="px-2">
                                                                    Qty
                                                                </TableHead> */}
                                                                <TableHead className="px-2">
                                                                    Back Order
                                                                    Qty
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {l?.items?.map(
                                                                (item, i) => (
                                                                    <BackOrderLine
                                                                        slug={
                                                                            slug
                                                                        }
                                                                        key={i}
                                                                        form={
                                                                            form
                                                                        }
                                                                        item={
                                                                            item
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </TabsContent>
                                            ),
                                    )}
                                </ScrollArea>
                            </Tabs>
                        </div>
                    </Form>
                )
            }
        />
    );
}
function BackOrderLine({ form, slug, item }) {
    const baseKey = `loader.${slug}.backOrders.${item.meta.uid}`;
    const checked = form.watch(`${baseKey}.checked`);
    const qty = form.watch(`${baseKey}.qty`);
    const loadQty = form.watch(`${baseKey}.loadQty`);
    const backQty = form.watch(`${baseKey}.backQty`);
    return (
        <TableRow
            className={cn(
                !backQty && item.qty > 0 && "grayscale-0",
                checked && "bg-orange-100 hover:bg-orange-100",
                backQty &&
                    "cursor-not-allowed bg-orange-200 hover:bg-orange-200",
            )}
            key={item.id}
        >
            <TableCell
                onClick={(e) => {
                    form.setValue(`${baseKey}.checked`, !checked);
                }}
                className={cn("cursor-pointer p-2 uppercase")}
            >
                <p className="text-primary">{item.description}</p>
            </TableCell>
            {/* <TableCell className={"p-2"}>
                <p className="text-primary">{item.qty}</p>
            </TableCell> */}
            <TableCell className={"p-2"}>
                {item.qty && (
                    <p className="text-primary">
                        {backQty || 0}/{item.qty}
                    </p>
                )}
                {/* {item.qty && (
                    <Input
                        type="number"
                        {...form.register(`${baseKey}.loadQty` as any)}
                        className="w-16 h-7"
                    />
                )} */}
            </TableCell>
        </TableRow>
    );
}
