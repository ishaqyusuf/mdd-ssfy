import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
import { LineInput } from "../line-input";
import { Context, useCreateContext, useCtx } from "./ctx";

interface Props {
    itemStepUid;
}
export default function MouldingLineItem({ itemStepUid }: Props) {
    const ctx = useCreateContext(itemStepUid);
    return (
        <>
            <Context.Provider value={ctx}>
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
                        {ctx.mouldings?.map((m, index) => (
                            <MouldingRow sn={index + 1} data={m} key={m.uid} />
                        ))}
                    </TableBody>
                </Table>
            </Context.Provider>
        </>
    );
}
function MouldingRow({
    data,
    sn,
}: {
    sn;
    data: ReturnType<
        MouldingClass["getMouldingLineItemForm"]
    >["mouldings"][number];
}) {
    const ctx = useCtx();
    const mfd = ctx.itemForm?.groupItem?.form?.[data.uid];

    const lineUid = data.uid;

    const valueChanged = () => {
        ctx.ctx.updateGroupedCost();
        ctx.ctx.calculateTotalPrice();
    };
    return (
        <TableRow className={cn(!mfd?.selected && "hidden")}>
            <TableCell className="font-mono">{sn}.</TableCell>
            <TableCell className="font-mono text-sm font-medium">
                {data.title}
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
            <TableCell className="">
                <Menu
                    noSize
                    Icon={null}
                    label={<Money value={mfd?.pricing?.unitPrice} />}
                >
                    <div className="min-w-[300px] p-2">
                        <div>
                            <Label>Price Summary</Label>
                        </div>
                        <dl>
                            {ctx.pricedSteps?.map((step) => (
                                <DataLine
                                    size="sm"
                                    key={step.title}
                                    label={step.title}
                                    value={
                                        <div className="flex items-center justify-end gap-4">
                                            <span>{step.value}</span>
                                            <MoneyBadge>
                                                {step.price}
                                            </MoneyBadge>
                                        </div>
                                    }
                                />
                            ))}
                            <DataLine
                                size="sm"
                                label="Moulding"
                                value={
                                    <div className="flex items-center justify-end gap-4">
                                        <span className="line-clamp-2 max-w-xs">{`${data.title}`}</span>
                                        <MoneyBadge>
                                            {data.basePrice?.price}
                                        </MoneyBadge>
                                    </div>
                                }
                            />
                            <DataLine
                                size="sm"
                                label="Custom Price"
                                value={
                                    <LineInput
                                        className="w-28"
                                        cls={ctx.ctx}
                                        name="pricing.customPrice"
                                        lineUid={lineUid}
                                        type="number"
                                        valueChanged={valueChanged}
                                    />
                                }
                            />
                        </dl>
                    </div>
                </Menu>
            </TableCell>
            <TableCell>
                <LineInput
                    cls={ctx.ctx}
                    name="pricing.addon"
                    lineUid={lineUid}
                    type="number"
                    valueChanged={valueChanged}
                />
                {/* <FormInput
                        type="number"
                        size="sm"
                        control={form.control}
                        name="pricing.addon"
                        inputProps={inputProps}
                    /> */}
            </TableCell>
            <TableCell>
                <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
                {/* <Money value={mfd?.pricing?.totalPrice} /> */}
            </TableCell>
            <TableCell align="right">
                <ConfirmBtn
                    disabled={ctx.ctx.selectCount == 1}
                    onClick={() => {
                        ctx.ctx.removeGroupItem(data.uid);
                    }}
                    trash
                    size="icon"
                />
            </TableCell>
        </TableRow>
    );
}
