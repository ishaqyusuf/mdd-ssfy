import { Button } from "@gnd/ui/button";
import { LineItemProvider, useGroupedItem, useLineItem } from "../context";
import { cn } from "@gnd/ui/cn";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { TableHead } from "@gnd/ui/table";
import { useTakeoffItem } from "../take-off/context";
import ConfirmBtn from "@/components/confirm-button";
import { QtyInput } from "./qty-input";
import { AnimatedNumber } from "@/components/animated-number";
import {
    LineInput,
    LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";

export function ServiceContent({}) {
    const { addService, groupClass, valueChanged } = useGroupedItem();
    const itemCtx = useTakeoffItem();
    const groupItem = itemCtx?.itemForm?.groupItem;
    return (
        <>
            <div className="space-y-3 lg:hidden">
                {groupItem?.itemIds?.map((itemId, sn) => (
                    <LineItemProvider
                        key={`mobile-${sn}`}
                        args={[
                            {
                                uid: itemId,
                                index: sn,
                            },
                        ]}
                    >
                        <ServiceMobileCard index={sn} />
                    </LineItemProvider>
                ))}
            </div>
            <div className="hidden lg:block">
                <Table className="table-fixed table-sm p-4 text-xs font-medium">
                    <TableHeader>
                        <TableRow className="uppercase">
                            <TableHead className="w-10">Sn.</TableHead>
                            <TableHead className="w-full">Service</TableHead>
                            <TableHead className="w-16">Tax</TableHead>
                            <TableHead className="w-16">Prod</TableHead>
                            <TableHead className="w-28">Qty</TableHead>
                            <TableHead className="w-16">Price</TableHead>
                            <TableHead className="w-16">Total</TableHead>
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
                                <TableRow
                                    className="hover:bg-transparent"
                                    key={itemId}
                                >
                                    <TableCell className="font-mono$">
                                        {sn + 1}.
                                    </TableCell>
                                    <TableCell className="uppercase">
                                        <LineInput
                                            cls={groupClass}
                                            name="meta.description"
                                            lineUid={itemId}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <LineSwitch
                                            cls={groupClass}
                                            name="meta.taxxable"
                                            lineUid={itemId}
                                            valueChanged={valueChanged}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <LineSwitch
                                            cls={groupClass}
                                            name="meta.produceable"
                                            lineUid={itemId}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <QtyInput />
                                    </TableCell>
                                    <TableCell>
                                        <UnitPrice />
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
            </div>
            <Button
                variant={"secondary"}
                className={cn(
                    "w-full",
                    "border border-transparent hover:border-border text-xs uppercase p-1 h-7 rounded font-mono$ overflow-hidden gap-2"
                )}
                onClick={addService}
            >
                <span>Add Service</span>
            </Button>
        </>
    );
}
function ServiceMobileCard({ index }: { index: number }) {
    const { groupClass, valueChanged } = useGroupedItem();
    const { lineUid } = useLineItem();
    return (
        <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase text-muted-foreground">
                    Service #{index + 1}
                </div>
                <Action />
            </div>
            <div className="mt-3 space-y-3">
                <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">
                        Service
                    </div>
                    <LineInput
                        cls={groupClass}
                        name="meta.description"
                        lineUid={lineUid}
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">Tax</div>
                        <LineSwitch
                            cls={groupClass}
                            name="meta.taxxable"
                            lineUid={lineUid}
                            valueChanged={valueChanged}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">Prod</div>
                        <LineSwitch
                            cls={groupClass}
                            name="meta.produceable"
                            lineUid={lineUid}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">Qty</div>
                        <QtyInput />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">Price</div>
                        <UnitPrice />
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">Total</div>
                    <div className="text-base font-semibold">
                        <TotalCell />
                    </div>
                </div>
            </div>
        </div>
    );
}
function UnitPrice() {
    const { mouldingItemStepUid, valueChanged, groupClass } = useGroupedItem();
    const { lineUid } = useLineItem();
    return (
        <LineInput
            cls={groupClass}
            name="pricing.customPrice"
            lineUid={lineUid}
            type="number"
            prefix="$"
            numberProps={{
                prefix: "$",
            }}
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
function TotalCell() {
    const line = useLineItem();
    return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}
