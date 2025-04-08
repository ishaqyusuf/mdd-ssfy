import { useCallback, useMemo } from "react";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import Button from "@/components/common/button";
import { Badge } from "@/components/ui/badge";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";

import { useTakeOffForm } from "./take-off-form";
import { useTakeOffSection } from "./take-off-section";

interface Props {}
export function AddTakeOffComponent({}: Props) {
    const ctx = useTakeOffForm();
    const components = ctx.components;
    return (
        <div className="flex  justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Button>
                        <Icons.Add className="mr-2 size-4" />
                        <span>Add</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="divide-y">
                    {components?.map((item, componentIndex) => (
                        <ComponentLineItem
                            key={item.itemControlUid}
                            componentIndex={componentIndex}
                        ></ComponentLineItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
function ComponentLineItem({ componentIndex }) {
    const takeOffCtx = useTakeOffSection();
    const { ctx, sectionIndex } = takeOffCtx;
    const component = ctx.components?.[componentIndex];

    const data = useMemo(() => {
        const { lh, rh, total } = component?.status?.qty;
        let availableQty = { lh, rh, total };

        ctx.list.map((a) =>
            a.components
                ?.filter((c) => c.itemUid == component?.itemControlUid)
                ?.map((c) => {
                    availableQty.total -= c.qty.total;
                    availableQty.rh -= c.qty.rh;
                    availableQty.lh -= c.qty.lh;
                    return c.qty;
                }),
        );
        return {
            availableQty,
            componentQty: { lh, rh, total },
            noHandle: !lh && !rh,
        };
    }, [component, ctx.list]);

    const select = useCallback(() => {
        takeOffCtx.append({
            itemUid: component.itemControlUid,
            qty: data.availableQty,
        });
    }, [data, component, takeOffCtx]);
    return (
        <DropdownMenuItem
            onClick={select}
            className="max-w-sm cursor-pointer "
            key={component.itemControlUid}
        >
            <div className="flex flex-col uppercase">
                <TCell.Primary>{component.title}</TCell.Primary>
                <TCell.Secondary className="flex ">
                    <div className="flex">
                        {[
                            component?.sectionTitle,
                            component?.subtitle,
                            component?.swing,
                        ]
                            ?.filter((a) => a)
                            ?.join(" | ")}
                    </div>
                    <div className="flex-1"></div>
                    {data.noHandle ? (
                        <Pill
                            label="Qty"
                            value={`${data.availableQty.total}/${data.componentQty.total}`}
                        />
                    ) : (
                        <></>
                    )}
                </TCell.Secondary>
            </div>
        </DropdownMenuItem>
    );
}
function Pill({ label, value }) {
    return (
        <Badge
            className="inline-flex gap-1 p-0 px-0.5 font-mono"
            variant={"outline"}
        >
            <span>{label}:</span>
            <span>{value}</span>
        </Badge>
    );
}
