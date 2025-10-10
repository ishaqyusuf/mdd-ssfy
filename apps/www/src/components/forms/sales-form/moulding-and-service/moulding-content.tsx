import { useState } from "react";
import { LineItemProvider, useGroupedItem, useLineItem } from "../context";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { SelectMoulding } from "./select-moulding";
import { useTakeoffItem } from "../take-off/context";
import { QtyInput } from "./qty-input";
import { AnimatedNumber } from "@/components/animated-number";
import { LineInput } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { MouldingClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/moulding-class";
import { Menu } from "@/components/(clean-code)/menu";
import Money from "@/components/_v1/money";
import { Label } from "@gnd/ui/label";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import ConfirmBtn from "@/components/confirm-button";

export function MouldingContent({}) {
    const ctx = useGroupedItem();
    const itemCtx = useTakeoffItem();
    const groupItem = itemCtx?.itemForm?.groupItem;
    return (
        <>
            <Table className="table-fixed p-4 text-xs font-medium">
                <TableHeader>
                    <TableRow className="uppercase">
                        <TableHead className="w-10">Sn.</TableHead>
                        <TableHead className="w-full">Moulding</TableHead>
                        <TableHead className="w-20">Qty</TableHead>
                        <TableHead className="w-28">Estimate</TableHead>
                        <TableHead className="w-28">Addon/Qty</TableHead>
                        <TableHead className="w-28">Line Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupItem?.itemIds?.map((itemId, sn) => (
                        <LineItemProvider
                            key={sn}
                            args={[
                                {
                                    uid: itemId,
                                    index: sn,
                                },
                            ]}
                        >
                            <TableRow>
                                <TableCell className="font-mono$">
                                    {sn + 1}.
                                </TableCell>
                                <TableCell className="uppercase">
                                    {
                                        groupItem?.form?.[itemId]?.meta
                                            ?.description
                                    }
                                </TableCell>
                                <TableCell>
                                    <QtyInput />
                                </TableCell>
                                <TableCell>
                                    <PriceEstimateCell />
                                </TableCell>
                                <TableCell>
                                    <AddonCell />
                                </TableCell>
                                <TableCell>
                                    <TotalCell />
                                </TableCell>
                                <TableCell>
                                    <Action />
                                </TableCell>
                            </TableRow>
                        </LineItemProvider>
                    ))}
                </TableBody>
            </Table>
            <div>
                <SelectMoulding />
            </div>
        </>
    );
}
function TotalCell() {
    const line = useLineItem();
    return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}
function AddonCell() {
    const { mouldingItemStepUid, valueChanged } = useGroupedItem();
    const { lineUid } = useLineItem();
    const mould = new MouldingClass(mouldingItemStepUid);
    return (
        <LineInput
            cls={mould}
            name="pricing.addon"
            lineUid={lineUid}
            type="number"
            valueChanged={valueChanged}
        />
    );
}
function Action() {
    const lineCtx = useLineItem();
    const ctx = useGroupedItem();
    const { lineForm, lineUid } = lineCtx;
    return (
        <>
            <ConfirmBtn
                disabled={ctx?.groupClass?.selectCount == 1}
                onClick={() => {
                    ctx?.removeItem(lineUid);
                }}
                trash
                size="icon"
            />
        </>
    );
}
function PriceEstimateCell({}) {
    const lineCtx = useLineItem();
    const ctx = useGroupedItem();
    const { lineForm, lineUid } = lineCtx;
    const mould = new MouldingClass(ctx.mouldingItemStepUid);
    const lineItem = mould.getMouldingLineItemForm();
    const moulding = ctx?.mouldings?.find(
        (m) => m.productId == lineForm?.mouldingProductId,
    );

    return (
        <Menu
            noSize
            Icon={null}
            label={<Money value={lineForm?.pricing?.unitPrice} />}
        >
            <div className="min-w-[300px] p-2">
                <div>
                    <Label>Price Summary</Label>
                </div>
                <dl>
                    {lineItem?.pricedSteps?.map((step) => (
                        <DataLine
                            size="sm"
                            key={step.title}
                            label={step.title}
                            value={
                                <div className="flex items-center justify-end gap-4">
                                    <span>{step.value}</span>
                                    <MoneyBadge>{step.price}</MoneyBadge>
                                </div>
                            }
                        />
                    ))}
                    <DataLine
                        size="sm"
                        label="Moulding"
                        value={
                            <div className="flex items-center justify-end gap-4">
                                <span className="line-clamp-2 max-w-xs">{`${moulding?.title}`}</span>
                                <MoneyBadge>{moulding?.salesPrice}</MoneyBadge>
                            </div>
                        }
                    />
                    <DataLine
                        size="sm"
                        label="Custom Price"
                        value={
                            <LineInput
                                className="w-28"
                                cls={mould}
                                name="pricing.customPrice"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={ctx.valueChanged}
                            />
                        }
                    />
                </dl>
            </div>
        </Menu>
    );
}
