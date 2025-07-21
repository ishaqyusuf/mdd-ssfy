import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import { AnimatedNumber } from "@/components/animated-number";
import { WageInput } from "@/components/forms/sales-form/hpt/wage-input";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { DropdownMenuShortcut } from "@gnd/ui/dropdown-menu";
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
import { Door } from "./door";

import {
    HptContext,
    HptContextProvider,
    HptLineContextProvider,
    useHpt,
    useHptLine,
} from "@/components/forms/sales-form/context";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import { HptNote } from "@/components/forms/sales-form/hpt/hpt-note";

interface Props {
    itemStepUid;
}
export default function HousePackageTool({ itemStepUid }: Props) {
    return (
        <HptContextProvider args={[itemStepUid]}>
            <Content />
        </HptContextProvider>
    );
}
function Content() {
    const ctx = useHpt();

    return (
        <div className="">
            <Tabs
                onValueChange={(e) => {
                    ctx.hpt.tabChanged(e);
                    // ctx.setTab(e);
                }}
                value={ctx.hpt.tabUid}
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
                                        ctx.hpt.tabUid == door.uid &&
                                            "rounded-b-none border-muted-foreground",
                                    )}
                                    variant={
                                        ctx.hpt.tabUid == door.uid
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
                                        // ctx.hpt.tabUid != door.uid &&
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
        </div>
    );
}
interface DoorSizeTable {
    door: HptContext["doors"][number];
    sn;
}
function DoorSizeTable({ door }: DoorSizeTable) {
    const ctx = useHpt();
    const itemType = ctx?.hpt?.getItemForm()?.groupItem?.itemType;
    const isSlab = itemType === "Door Slabs Only";
    return (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
                <Table className="table-fixed   p-4 font-medium">
                    <TableHeader className="text-xs">
                        <TableRow className="uppercase">
                            <TableHead className="font-mono w-8">#</TableHead>
                            <TableHead className="w-36">Size</TableHead>
                            {ctx.config.hasSwing && (
                                <TableHead className="w-28">Swing</TableHead>
                            )}
                            {!isSlab || (
                                <TableHead className="w-16">PROD</TableHead>
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
                            <TableHead className=""></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {door.sizeList.map((sl, i) => (
                            <DoorSizeRow sn={i + 1} lineUid={sl.path} key={i} />
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
                                                ctx.hpt.addHeight(sl);
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
function DoorSizeRow({ lineUid, sn }: { lineUid; sn }) {
    return (
        <HptLineContextProvider
            args={[
                {
                    lineUid,
                    sn,
                },
            ]}
        >
            <DoorSizeRowContent />
        </HptLineContextProvider>
    );
}
function DoorSizeRowContent() {
    const ctx = useHpt();
    const line = useHptLine();
    const { lineUid, sizeForm, size, sn, valueChanged } = line;
    const { isSlab, showNote, setShowNote } = ctx;
    console.log({ lineUid });

    if (!sizeForm?.selected) return null;
    console.log({ lineUid });
    return (
        <>
            <TableRow className={cn(!sizeForm?.selected && "hidden")}>
                <TableCell className="font-mono">{sn}.</TableCell>
                <TableCell className="font-mono text-sm font-semibold">
                    {size.size}
                </TableCell>
                {!isSlab || (
                    <TableCell>
                        <LineSwitch
                            cls={ctx.hpt}
                            name="prodOverride.production"
                            lineUid={lineUid}
                        />
                    </TableCell>
                )}
                {ctx.config.hasSwing && (
                    <TableCell>
                        <LineInput
                            cls={ctx.hpt}
                            name="swing"
                            lineUid={lineUid}
                        />
                    </TableCell>
                )}
                {ctx.config.noHandle ? (
                    <TableCell>
                        <LineInput
                            cls={ctx.hpt}
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
                                cls={ctx.hpt}
                                name="qty.lh"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                            />
                        </TableCell>
                        <TableCell className="">
                            <LineInput
                                cls={ctx.hpt}
                                name="qty.rh"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                            />
                        </TableCell>
                    </>
                )}
                <TableCell className="">
                    <PriceEstimateCell />
                </TableCell>
                <TableCell>
                    <WageInput />
                </TableCell>
                <TableCell>
                    <AnimatedNumber
                        value={sizeForm?.pricing?.totalPrice || 0}
                    />
                </TableCell>
                <TableCell
                    align="right"
                    className="flex items-center justify-end"
                >
                    <Button
                        variant={showNote ? "default" : "outline"}
                        size="xs"
                        className=""
                        onClick={(e) => {
                            setShowNote(!showNote);
                        }}
                    >
                        {showNote ? "Close Notes" : "Open Notes"}
                    </Button>
                    <ConfirmBtn
                        disabled={ctx.hpt.selectCount == 1}
                        onClick={() => {
                            ctx.hpt.removeGroupItem(size.path);
                        }}
                        trash
                        size="icon"
                    />
                </TableCell>
            </TableRow>
            <HptNote />
        </>
    );
}
