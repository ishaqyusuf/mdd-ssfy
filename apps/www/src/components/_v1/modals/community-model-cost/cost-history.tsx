"use client";

import { _getModelCostStat } from "@/app/(v1)/_actions/community/_model-cost-stat";
import {
    _deleteCommunityModelCost,
    _saveCommunitModelCostData,
} from "@/app/(v1)/_actions/community/community-model-cost";
import { _getCommunityModelCostUnits } from "@/app/(v1)/_actions/community/community-model-cost-units";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { ModelCostProps } from "./modal";

export function CommunityCostHistory({
    form,
    data,
    watchIndex,
}: ModelCostProps) {
    const { prepend, remove, fields } = useFieldArray({
        control: form.control,
        name: "costs",
    });
    function createCost() {
        if (fields?.some((c) => !c.createdAt)) {
            toast.error("You have unsaved costs");
        } else
            prepend({
                type: "task-costs",
                model: data?.modelName,
            } as any);
        form.setValue("index", 0);
    }
    return (
        <div className="space-y-2 pr-2 sm:w-2/5">
            <div className="">
                <Label>Cost History</Label>
            </div>
            <div className="">
                <Button
                    onClick={createCost}
                    variant="outline"
                    className="mt-1 h-7 w-full"
                >
                    <Plus className="mr-2 size-4" />
                    <span>New Cost</span>
                </Button>
            </div>
            <ScrollArea className="h-[350px] max-h-[350px] w-full">
                <div className="divide-y">
                    {fields.map((f, i) => (
                        <div
                            className="group mr-2 flex items-center space-x-2"
                            key={i}
                        >
                            <Button
                                variant={
                                    i == watchIndex ? "secondary" : "ghost"
                                }
                                className="flex h-auto w-full cursor-pointer px-2 py-2  text-sm hover:bg-slate-200"
                                onClick={() => {
                                    if (watchIndex != i)
                                        form.setValue("index", i);
                                }}
                            >
                                <div className="flex flex-1 items-center justify-between space-x-4">
                                    <div className="flex flex-col items-start">
                                        <div className="text-start text-muted-foreground">
                                            {f.title || "New Cost"}
                                        </div>
                                        <div>
                                            <Money
                                                value={f?.meta?.grandTotal}
                                            ></Money>
                                        </div>
                                    </div>
                                    <div>
                                        <Badge className="" variant={"outline"}>
                                            {form.getValues(`stats.${f._id}`) ||
                                                0}
                                        </Badge>
                                    </div>
                                </div>
                            </Button>
                            <ConfirmBtn
                                onClick={async () => {
                                    if (watchIndex == i && fields.length > 1) {
                                        if (
                                            watchIndex > 0 &&
                                            fields.length - 1 == watchIndex
                                        )
                                            form.setValue("index", i + 1);
                                        //    changeIndex(i - 1);
                                    }
                                    if (fields.length == 1) createCost();
                                    await _deleteCommunityModelCost(f._id);
                                    remove(i);

                                    // changeIndex()
                                }}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "opacity-20 group-hover:opacity-100",
                                )}
                                trash
                            ></ConfirmBtn>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
