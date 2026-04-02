import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { LineInput, LineSwitch } from "../line-input";
import { Context, useCreateContext, useCtx } from "./ctx";

interface Props {
    itemStepUid;
}
export default function ServiceLineItem({ itemStepUid }: Props) {
    const ctx = useCreateContext(itemStepUid);

    return (
        <Context.Provider value={ctx}>
            <div className="space-y-3 lg:hidden">
                {ctx.itemIds?.map((m, index) => (
                    <ServiceMobileCard
                        key={`mobile-${m}`}
                        sn={index + 1}
                        lineUid={m}
                    />
                ))}
                <div className="rounded-xl border bg-accent/40 p-3">
                    <Button
                        onClick={() => {
                            ctx.ctx.addServiceLine();
                        }}
                        className="w-full"
                    >
                        <Icons.add className="mr-2 size-4" />
                        <span>Line</span>
                    </Button>
                </div>
            </div>
            <div className="hidden lg:block">
                <Table className="table-fixed p-4 text-xs font-medium">
                    <TableHeader>
                        <TableRow className="uppercase">
                            <TableHead className="w-10">Sn.</TableHead>
                            <TableHead className="w-full">
                                Description
                            </TableHead>
                            <TableHead className="w-16">Tax</TableHead>
                            <TableHead className="w-16">
                                <TextWithTooltip
                                    text={"Production"}
                                    className="w-16"
                                ></TextWithTooltip>
                            </TableHead>
                            <TableHead className="w-28">Qty</TableHead>
                            <TableHead className="w-28">Unit Price</TableHead>

                            <TableHead className="w-28">Line Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ctx.itemIds?.map((m, index) => (
                            <ServiceRow sn={index + 1} lineUid={m} key={m} />
                        ))}
                    </TableBody>
                    <TableFooter className="bg-accent">
                        <TableRow>
                            <TableCell>
                                <Button
                                    onClick={() => {
                                        ctx.ctx.addServiceLine();
                                    }}
                                >
                                    <Icons.add className="mr-2 size-4" />
                                    <span>Line</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </Context.Provider>
    );
}
function ServiceRow({ lineUid, sn }: { sn; lineUid }) {
    const ctx = useCtx();
    const mfd = ctx.itemForm?.groupItem?.form?.[lineUid];
    const valueChanged = () => {
        ctx.ctx.updateGroupedCost();
        ctx.ctx.calculateTotalPrice();
    };
    return (
        <>
            <TableRow className={cn(!mfd?.selected && "hidden")}>
                <TableCell className="font-mono$">{sn}.</TableCell>
                <TableCell className="font-mono$ text-sm font-medium">
                    <LineInput
                        cls={ctx.ctx}
                        name="meta.description"
                        lineUid={lineUid}
                    />
                </TableCell>
                <TableCell>
                    <LineSwitch
                        cls={ctx.ctx}
                        name="meta.taxxable"
                        lineUid={lineUid}
                        valueChanged={valueChanged}
                    />
                </TableCell>
                <TableCell>
                    <LineSwitch
                        cls={ctx.ctx}
                        name="meta.produceable"
                        lineUid={lineUid}
                    />
                </TableCell>
                <TableCell>
                    <LineInput
                        cls={ctx.ctx}
                        name="qty.total"
                        lineUid={lineUid}
                        type="number"
                        valueChanged={valueChanged}
                        mask
                        qtyInputProps={{
                            min: 1,
                        }}
                    />
                </TableCell>
                <TableCell>
                    <LineInput
                        cls={ctx.ctx}
                        name="pricing.customPrice"
                        lineUid={lineUid}
                        type="number"
                        valueChanged={valueChanged}
                    />
                    {/* <Input
                        type="number"
                        defaultValue={mfd?.addon}
                        onChange={(e) => {
                            ctx.ctx.dotUpdateGroupItemFormPath(
                                lineUid,
                                "pricing.addon",
                                +e.target.value
                            );
                            valueChanged();
                        }}
                    /> */}
                </TableCell>
                <TableCell>
                    <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
                    {/* <Money value={mfd?.pricing?.totalPrice} /> */}
                </TableCell>
                <TableCell align="right">
                    <ConfirmBtn
                        onClick={() => {
                            ctx.ctx.removeGroupItem(lineUid);
                        }}
                        trash
                        disabled={ctx.ctx.selectCount == 1}
                        size="icon"
                    />
                </TableCell>
            </TableRow>
        </>
    );
}

function ServiceMobileCard({ lineUid, sn }: { sn; lineUid }) {
    const ctx = useCtx();
    const mfd = ctx.itemForm?.groupItem?.form?.[lineUid];
    const valueChanged = () => {
        ctx.ctx.updateGroupedCost();
        ctx.ctx.calculateTotalPrice();
    };

    if (!mfd?.selected) return null;

    return (
        <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase text-muted-foreground">
                    Service #{sn}
                </div>
                <ConfirmBtn
                    onClick={() => {
                        ctx.ctx.removeGroupItem(lineUid);
                    }}
                    trash
                    disabled={ctx.ctx.selectCount == 1}
                    size="icon"
                />
            </div>
            <div className="mt-3 space-y-3">
                <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">
                        Description
                    </div>
                    <LineInput
                        cls={ctx.ctx}
                        name="meta.description"
                        lineUid={lineUid}
                    />
                </div>
                <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">
                            Tax
                        </div>
                        <LineSwitch
                            cls={ctx.ctx}
                            name="meta.taxxable"
                            lineUid={lineUid}
                            valueChanged={valueChanged}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">
                            Production
                        </div>
                        <LineSwitch
                            cls={ctx.ctx}
                            name="meta.produceable"
                            lineUid={lineUid}
                        />
                    </div>
                    <div className="space-y-1 min-w-0">
                        <div className="text-xs uppercase text-muted-foreground">
                            Qty
                        </div>
                        <LineInput
                            cls={ctx.ctx}
                            name="qty.total"
                            lineUid={lineUid}
                            type="number"
                            valueChanged={valueChanged}
                            mask
                            qtyInputProps={{
                                min: 1,
                            }}
                        />
                    </div>
                    <div className="space-y-1 min-w-0">
                        <div className="text-xs uppercase text-muted-foreground">
                            Unit Price
                        </div>
                        <LineInput
                            cls={ctx.ctx}
                            name="pricing.customPrice"
                            lineUid={lineUid}
                            type="number"
                            valueChanged={valueChanged}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">
                        Line Total
                    </div>
                    <div className="text-base font-semibold">
                        <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
                    </div>
                </div>
            </div>
        </div>
    );
}
