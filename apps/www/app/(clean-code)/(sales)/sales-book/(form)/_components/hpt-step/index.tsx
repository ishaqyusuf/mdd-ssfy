import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import { AnimatedNumber } from "@/components/animated-number";
import { WageInput } from "@/components/forms/sales-form/wage-input";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { DropdownMenuShortcut } from "@gnd/ui/dropdown-menu";
import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { LineInput, LineSwitch } from "../line-input";
import { Context, HptContext, useCreateContext, useCtx } from "./ctx";
import { Door } from "./door";

interface Props {
    itemStepUid;
}
export default function HousePackageTool({ itemStepUid }: Props) {
    const ctx = useCreateContext(itemStepUid);

    return (
        <div className="">
            <Context.Provider value={ctx}>
                <Tabs
                    onValueChange={(e) => {
                        ctx.ctx.tabChanged(e);
                        // ctx.setTab(e);
                    }}
                    value={ctx.ctx.tabUid}
                >
                    <TabsList className="bg-transparent">
                        {ctx.doors?.map((door) => (
                            <TabsTrigger
                                asChild
                                key={door.uid}
                                value={door.uid}
                                className="bg-white p-0"
                            >
                                <div className="">
                                    <Button
                                        size="xs"
                                        className={cn(
                                            "border-b-2 border-b-transparent",
                                            ctx.ctx.tabUid == door.uid &&
                                                "rounded-b-none border-muted-foreground",
                                        )}
                                        variant={
                                            ctx.ctx.tabUid == door.uid
                                                ? "secondary"
                                                : "ghost"
                                        }
                                    >
                                        <TextWithTooltip
                                            className="max-w-[260px]"
                                            text={door.title}
                                        />
                                    </Button>
                                    <div
                                        className={cn(
                                            // ctx.ctx.tabUid != door.uid &&
                                            "hidden",
                                        )}
                                    >
                                        <Menu>
                                            <Menu.Item Icon={Repeat}>
                                                Swap Door
                                            </Menu.Item>
                                        </Menu>
                                    </div>
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {ctx.doors?.map((door, i) => (
                        <TabsContent key={door.uid} value={door.uid}>
                            <DoorSizeTable door={door} sn={i + 1} />
                        </TabsContent>
                    ))}
                </Tabs>
            </Context.Provider>
        </div>
    );
}
interface DoorSizeTable {
    door: HptContext["doors"][number];
    sn;
}
function DoorSizeTable({ door }: DoorSizeTable) {
    const ctx = useCtx();
    const itemType = ctx?.ctx?.getItemForm()?.groupItem?.itemType;
    const isSlab = itemType === "Door Slabs Only";
    return (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
                <Table className="table-fixed   p-4 font-medium">
                    <TableHeader className="text-xs">
                        <TableRow className="uppercase">
                            <TableHead className="font-mono w-8">#</TableHead>
                            <TableHead className="w-full">Size</TableHead>
                            {ctx.config.hasSwing && (
                                <TableHead className="w-28">Swing</TableHead>
                            )}
                            {!isSlab || (
                                <TableHead className="w-28">PROD</TableHead>
                            )}
                            {ctx.config.noHandle ? (
                                <TableHead
                                    className="w-20 text-center"
                                    align="center"
                                >
                                    <span className="">Qty</span>
                                </TableHead>
                            ) : (
                                <>
                                    <TableHead className="w-20">Lh</TableHead>
                                    <TableHead className="w-20">Rh</TableHead>
                                </>
                            )}
                            <TableHead className="w-28">Estimate</TableHead>
                            <TableHead className="w-28 whitespace-nowrap">
                                Labor/Qty
                            </TableHead>
                            {/* <TableHead className="w-28">Addon/Qty</TableHead> */}
                            <TableHead className="w-28">Line Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {door.sizeList.map((sl, i) => (
                            <DoorSizeRow sn={i + 1} size={sl} key={i} />
                        ))}
                    </TableBody>

                    <TableFooter className="bg-accent">
                        <TableRow>
                            <TableCell>
                                <Menu
                                    Trigger={
                                        <Button>
                                            <Icons.add className="mr-2 size-4" />
                                            <span>Size</span>
                                        </Button>
                                    }
                                >
                                    {door.sizeList.map((sl) => (
                                        <Menu.Item
                                            onClick={() => {
                                                ctx.ctx.addHeight(sl);
                                            }}
                                            key={sl.path}
                                            disabled={sl.selected}
                                        >
                                            {sl.title}

                                            <DropdownMenuShortcut>
                                                <Badge
                                                    variant={
                                                        sl.salesPrice
                                                            ? "destructive"
                                                            : "secondary"
                                                    }
                                                >
                                                    {sl.salesPrice ? (
                                                        <Money
                                                            value={
                                                                sl.salesPrice
                                                            }
                                                        />
                                                    ) : (
                                                        "$"
                                                    )}
                                                </Badge>
                                            </DropdownMenuShortcut>
                                        </Menu.Item>
                                    ))}
                                </Menu>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <div className="hidden lg:block">
                <Door door={door} />
            </div>
        </div>
    );
}
function DoorSizeRow({ size, sn }: { size; sn }) {
    const lineUid = size.path;
    const ctx = useCtx();
    const sizeForm = ctx.itemForm?.groupItem.form[size.path];
    const itemType = ctx?.ctx?.getItemForm()?.groupItem?.itemType;
    const isSlab = itemType === "Door Slabs Only";
    const valueChanged = () => {
        ctx.ctx.updateGroupedCost();
        ctx.ctx.calculateTotalPrice();
    };
    const unitLabor = ctx.ctx.dotGetGroupItemFormValue(
        lineUid,
        "pricing.unitLabor",
    );
    return (
        <TableRow className={cn(!sizeForm?.selected && "hidden")}>
            <TableCell className="font-mono">{sn}.</TableCell>
            <TableCell className="font-mono text-sm font-semibold">
                {size.title}
            </TableCell>
            {!isSlab || (
                <TableCell>
                    <LineSwitch
                        cls={ctx.ctx}
                        name="prodOverride.production"
                        lineUid={lineUid}
                    />
                </TableCell>
            )}
            {ctx.config.hasSwing && (
                <TableCell>
                    <LineInput cls={ctx.ctx} name="swing" lineUid={lineUid} />
                </TableCell>
            )}
            {ctx.config.noHandle ? (
                <TableCell>
                    <LineInput
                        cls={ctx.ctx}
                        name="qty.total"
                        lineUid={lineUid}
                        className="w-16 text-center"
                        type="number"
                        valueChanged={valueChanged}
                    />
                </TableCell>
            ) : (
                <>
                    <TableCell className="">
                        <LineInput
                            cls={ctx.ctx}
                            name="qty.lh"
                            lineUid={lineUid}
                            type="number"
                            valueChanged={valueChanged}
                        />
                    </TableCell>
                    <TableCell className="">
                        <LineInput
                            cls={ctx.ctx}
                            name="qty.rh"
                            lineUid={lineUid}
                            type="number"
                            valueChanged={valueChanged}
                        />
                    </TableCell>
                </>
            )}
            <TableCell className="">
                <Menu
                    noSize
                    Icon={null}
                    triggerSize="xs"
                    label={<Money value={sizeForm?.pricing?.unitPrice} />}
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
                                label="Door"
                                value={
                                    <div className="flex items-center justify-end gap-4">
                                        <span>{`${size.title}`}</span>
                                        <MoneyBadge>
                                            {
                                                sizeForm?.pricing?.itemPrice
                                                    ?.salesPrice
                                            }
                                        </MoneyBadge>
                                    </div>
                                }
                            />
                            <DataLine
                                size="sm"
                                label="Addon Price"
                                value={
                                    <LineInput
                                        className="w-28"
                                        cls={ctx.ctx}
                                        name="pricing.addon"
                                        lineUid={lineUid}
                                        type="number"
                                        valueChanged={valueChanged}
                                    />
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
                <WageInput
                    value={unitLabor}
                    valueChanged={valueChanged}
                    cls={ctx.ctx}
                    lineUid={lineUid}
                />
            </TableCell>
            <TableCell>
                <AnimatedNumber value={sizeForm?.pricing?.totalPrice || 0} />
            </TableCell>
            <TableCell align="right">
                <ConfirmBtn
                    disabled={ctx.ctx.selectCount == 1}
                    onClick={() => {
                        ctx.ctx.removeGroupItem(size.path);
                    }}
                    trash
                    size="icon"
                />
            </TableCell>
        </TableRow>
    );
}
