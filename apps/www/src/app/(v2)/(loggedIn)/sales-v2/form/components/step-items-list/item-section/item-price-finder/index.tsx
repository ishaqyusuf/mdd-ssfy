"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { TableCol } from "@/components/common/data-table/table-cells";
import { ServerPromiseType } from "@/types";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { useDykeForm } from "../../../../_hooks/form-context";
import {
    UseMultiComponentItem,
    UseMultiComponentSizeRow,
} from "../../../../_hooks/use-multi-component-item";
import { getDoorPrices } from "./get-price";

export interface ItemPriceFinderProps {
    dykeDoorId?;
    moldingId?;
    componentTitle?;
    casingId?;
    jambSizeId?;
    dimension?;
    componentItem?: UseMultiComponentItem;
    sizeRow?: UseMultiComponentSizeRow;
}
export default function ItemPriceFinder({
    componentItem,
    sizeRow,
    ...props
}: ItemPriceFinderProps) {
    const [open, setOpen] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);
    const [priceChart, setPriceChart] =
        useState<ServerPromiseType<typeof getDoorPrices>["Response"]>();

    const form = useDykeForm();
    function selectPrice(priceIndex) {
        const priceTab = priceChart?.priceTabs[tabIndex];
        const price = priceTab?.priceList?.[priceIndex];
        // if(priceTab == '')
        form?.setValue(
            !sizeRow
                ? `${componentItem?.multiComponentComponentTitleKey}.unitPrice`
                : (`${sizeRow?.sizeRootKey}.${priceTab?.priceKey}` as any),
            price?.value,
        );
    }
    useEffect(() => {
        async function fetch() {
            const resp = await getDoorPrices(props as any);
            setPriceChart(resp);
        }
        fetch();
    }, []);

    const currentPriceList = () => priceChart?.priceTabs?.[tabIndex]?.priceList;
    const emptyPriceList = () => currentPriceList()?.length == 0;

    return (
        <div>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        disabled={!priceChart?.hasPrice}
                        size={"icon"}
                        className="h-8 w-8"
                        variant={!priceChart?.hasPrice ? "ghost" : "outline"}
                    >
                        <Icons.dollar className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {(priceChart?.priceTabs as any)?.length > 1 ? (
                        <div className="flex">
                            {priceChart?.priceTabs?.map((tab, i) => (
                                <Button
                                    onClick={() => {
                                        setTabIndex(i);
                                    }}
                                    key={tab.title}
                                    size={"sm"}
                                    variant={
                                        tabIndex == i ? "default" : "ghost"
                                    }
                                >
                                    {tab.title}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <></>
                    )}
                    <div className="mt-4 max-h-[25vh] min-h-[100px] min-w-[200px] overflow-auto">
                        {emptyPriceList() ? (
                            <div className="flex h-[100px] flex-col items-center justify-center space-y-4">
                                <Icons.dollar className="h-10 w-10 text-muted-foreground text-opacity-25" />
                                <TableCol.Secondary>
                                    No Price History
                                </TableCol.Secondary>
                            </div>
                        ) : (
                            currentPriceList()?.map((price, priceIndex) => (
                                <Button
                                    onClick={() => selectPrice(priceIndex)}
                                    className="flex w-full"
                                    key={priceIndex}
                                    variant={"ghost"}
                                >
                                    <div className="flex flex-1 justify-between">
                                        <Money value={price.value} />
                                        <TableCol.Secondary>
                                            <TableCol.Date>
                                                {price.date}
                                            </TableCol.Date>
                                        </TableCol.Secondary>
                                    </div>
                                </Button>
                            ))
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
