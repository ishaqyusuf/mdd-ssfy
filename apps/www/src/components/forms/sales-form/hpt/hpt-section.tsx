import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Menu } from "@/components/(clean-code)/menu";
import { AnimatedNumber } from "@/components/animated-number";
import { WageInput } from "@/components/forms/sales-form/hpt/wage-input";
import { cn } from "@/lib/utils";
import { Notebook, Repeat } from "lucide-react";

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

import { Door } from "./hpt-door";

import {
    HptContext,
    HptContextProvider,
    HptLineContextProvider,
    useHpt,
    useHptLine,
} from "@/components/forms/sales-form/context";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import { HptNote } from "@/components/forms/sales-form/hpt/hpt-note";
import {
    LineInput,
    LineSwitch,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { HptAddDoorSize } from "./hpt-add-door-size";
import { Checkbox } from "@gnd/ui/checkbox";

interface Props {
    itemStepUid;
}
export function HptSection({ itemStepUid }: Props) {
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
                                        "border-b-2 border-b-transparent uppercase",
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
function DoorSizeTable({ door, sn }: DoorSizeTable) {
    const ctx = useHpt();

    const itemType = ctx?.hpt?.getItemForm()?.groupItem?.itemType;
    const isSlab = itemType === "Door Slabs Only";
    return (
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="xl:col-span-3">
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
                            <DoorSizeRow
                                doorIndex={sn - 1}
                                sn={i + 1}
                                lineUid={sl.path}
                                key={i}
                            />
                        ))}
                    </TableBody>
                    <TableFooter className="bg-accent">
                        <TableRow>
                            <TableCell>
                                <HptAddDoorSize doorIndex={sn - 1} />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <div className="hidden xl:block">
                <Door door={door} />
            </div>
        </div>
    );
}
function DoorSizeRow({ lineUid, sn, doorIndex }: { lineUid; sn; doorIndex }) {
    return (
        <HptLineContextProvider
            args={[
                {
                    lineUid,
                    sn,
                },
            ]}
        >
            <DoorSizeRowContent doorIndex={doorIndex} sizeIndex={sn - 1} />
        </HptLineContextProvider>
    );
}
function DoorSizeRowContent({ doorIndex, sizeIndex }) {
    const ctx = useHpt();
    const line = useHptLine();
    const { lineUid, zDoor, sizeForm, size, sn, valueChanged } = line;
    const { isSlab, showNote, setShowNote } = ctx;

    if (!zDoor?.selected) return null;

    return (
        <>
            <TableRow
                className={cn(
                    // !sizeForm?.selected && "hidden",
                    "hover:bg-transparent",
                )}
            >
                <TableCell className="font-mono"></TableCell>
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
                            mask
                            qtyInputProps={{
                                min: 0,
                            }}
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
                                mask
                                qtyInputProps={{
                                    min: 0,
                                }}
                            />
                        </TableCell>
                        <TableCell className="">
                            <LineInput
                                cls={ctx.hpt}
                                name="qty.rh"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                                mask
                                qtyInputProps={{
                                    min: 1,
                                }}
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
                        <Notebook className="size-4" />
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
