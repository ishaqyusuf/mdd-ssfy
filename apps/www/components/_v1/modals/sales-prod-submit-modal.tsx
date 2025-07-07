"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { orderItemProductionAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-production";
import { useDataPage } from "@/lib/data-page-context";
import { closeModal } from "@/lib/modal";
import { useAppSelector } from "@/store";
import { ISalesOrder, ISalesOrderItem } from "@/types/sales";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import Btn from "../btn";
import { Info } from "../info";
import BaseModal from "./base-modal";

export interface ICompleteItemProd {
    itemId;
    note;
    qty;
    submittedQty;
    pendingQty;
}
export default function SalesProdSubmitModal() {
    const form = useForm<ICompleteItemProd>({
        defaultValues: {},
    });

    const { data: order } = useDataPage<ISalesOrder>();
    const { orderId, slug, id } = order;
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const watchQty = form.watch("qty");
    const _submit = async (ctx) => {
        startTransition(async () => {
            await orderItemProductionAction({
                ...form.getValues(),
                action: ctx.action,
                qty: +watchQty,
                order: {
                    orderId,
                    slug,
                    id,
                },
            });
            closeModal();
            route.refresh();
            toast.success("Success");
        });
        //
    };

    const wPendingQty = form.watch("pendingQty");
    const selectQty = useCallback(
        (q) => {
            form.setValue("qty", q);
        },
        [form],
    );

    return (
        <BaseModal<{ item: ISalesOrderItem; action: "Submit" | "Cancel" }>
            className=""
            onOpen={(item) => {
                const {
                    id: itemId,
                    qty,
                    meta: { produced_qty = 0 },
                } = item.item;
                let pendingQty = (qty || 0) - (produced_qty || 0);
                if (item.action == "Cancel") pendingQty = produced_qty || 0;
                const _data = {
                    pendingQty,
                    qty: Math.min(1, pendingQty).toString(),
                    submittedQty: produced_qty,
                    note: "",
                    itemId,
                };
                form.reset(_data);
                console.log(_data);
            }}
            onClose={() => {}}
            modalName="prodItemUpdate"
            Title={({ data: ctx }) => <div>{ctx?.action} Item Production</div>}
            Content={({ data: ctx }) => (
                <>
                    <div className="grid gap-4">
                        <Info label="Item">{ctx?.item.description}</Info>
                        <Info label="Status">
                            <span>
                                {ctx?.item.meta.produced_qty || 0} of{" "}
                                {ctx?.item.qty} Completed
                            </span>
                        </Info>
                        <Info
                            label={
                                ctx?.action == "Cancel"
                                    ? "Cancel Production Qty"
                                    : "Submit Qty"
                            }
                        >
                            <div className="flex flex-wrap">
                                {wPendingQty > 15 ? (
                                    <Select
                                        value={watchQty}
                                        onValueChange={(e) =>
                                            form.setValue("qty", e)
                                        }
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {Array(wPendingQty)
                                                    .fill(0)
                                                    .map((_, i) => {
                                                        const v = (
                                                            i + 1
                                                        ).toString();
                                                        return (
                                                            <SelectItem
                                                                key={i}
                                                                value={v}
                                                            >
                                                                {v}
                                                            </SelectItem>
                                                        );
                                                    })}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    Array(wPendingQty)
                                        .fill(0)
                                        .map((_, i) => (
                                            <Button
                                                onClick={() => selectQty(i + 1)}
                                                className="m-1 w-10"
                                                variant={
                                                    watchQty == i + 1
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                key={i}
                                            >
                                                {i + 1}
                                            </Button>
                                        ))
                                )}
                            </div>
                        </Info>
                        <Info className="" label="Note">
                            <Textarea {...form.register("note")} />
                        </Info>
                    </div>
                </>
            )}
            Footer={({ data }) => (
                <Btn
                    isLoading={isSaving}
                    onClick={() => _submit(data)}
                    size="sm"
                    type="submit"
                >
                    Save
                </Btn>
            )}
        ></BaseModal>
    );
}
