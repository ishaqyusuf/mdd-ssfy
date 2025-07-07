"use client";

import React, { memo, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { _getModelCostStat } from "@/app/(v1)/_actions/community/_model-cost-stat";
import {
    _deleteCommunityModelCost,
    _saveCommunitModelCostData,
} from "@/app/(v1)/_actions/community/community-model-cost";
import { saveModelCost } from "@/app/(v1)/_actions/community/model-costs";
import { calculateCommunitModelCost } from "@/lib/community/community-utils";
import { deepCopy } from "@/lib/deep-copy";
import { cn, sum } from "@/lib/utils";
import {
    ICommunityTemplate,
    ICostChart,
    IHomeTemplate,
} from "@/types/community";
import { Plus } from "lucide-react";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { Badge } from "@gnd/ui/badge";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import Btn from "../btn";
import ConfirmBtn from "../confirm-btn";
import { DatePicker } from "../date-range-picker";
import BaseModal from "./base-modal";

export default function ModelCostModal({ community }: { community?: Boolean }) {
    const form = useForm<FormProps>({
        defaultValues: {},
    });
    const { append, prepend, fields, replace } = useFieldArray({
        control: form.control,
        name: "costs",
    });
    const [titleList, setTitleList] = useState<string[]>([]);
    useEffect(() => {
        setTitleList(fields.map((f) => f.title));
    }, fields);
    const [index, setIndex] = useState(0);

    async function init(data: IHomeTemplate) {
        let costs = deepCopy<ICostChart[]>(
            (data as any)?.pivot?.modelCosts || data.costs || [],
        )?.map((c) => {
            if (c.startDate) c.startDate = new Date(c.startDate);
            if (c.endDate) c.endDate = new Date(c.endDate);
            (c as any)._id = c.id;
            return c;
        });
        if (!costs.length)
            costs = [
                {
                    meta: {},
                },
            ] as any;
        // console.log(costs);
        // replace(deepCopy(costs));
        const stat = await _getModelCostStat(costs, data.id);

        form.reset({
            costs: [
                ...costs.filter((entry) => entry.endDate === null),
                ...costs
                    .filter((entry) => entry.endDate !== null)
                    .sort((a, b) => Number(b.startDate) - Number(a.startDate)),
            ],
            costStats: stat as any,
        });
        setIndex(0);
    }
    async function changeIndex(to) {
        setIndex(-1);
        // await timeout(500);
        setIndex(to);
    }
    return (
        <BaseModal<any>
            className="sm:max-w-[700px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="modelCost"
            Title={({ data }) => <div>Model Cost ({data?.modelName})</div>}
            Subtitle={({ data }) => <>{data?.project?.title}</>}
            Content={({ data }) => (
                <Form {...form}>
                    <div className="-mb-10 flex w-full divide-x">
                        <CostHistory
                            form={form}
                            data={data}
                            community={community}
                            changeIndex={changeIndex}
                            index={index}
                        />
                        <div className="grid flex-1 grid-cols-4  gap-2 pl-2">
                            {fields.map(
                                (field, fIndex) =>
                                    fIndex == index && (
                                        <MemoCostForm
                                            key={fIndex}
                                            form={form}
                                            data={data}
                                            community={community}
                                            fIndex={fIndex}
                                            changeIndex={changeIndex}
                                            index={index}
                                        />
                                    ),
                            )}
                        </div>
                    </div>
                </Form>
            )}
        />
    );
}
interface FormProps {
    costs: (ICostChart & { _id })[];
    includeCompleted;
    costStats: {
        [k in any]: number;
    };
}
interface Props {
    form: UseFormReturn<FormProps>;
    data;
    changeIndex;
    index;
    community?;
    fIndex?;
}
export function CostForm({ form, data, fIndex, community, index }: Props) {
    const { prepend, fields } = useFieldArray({
        control: form.control,
        name: "costs",
    });
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    async function submit(data: ICommunityTemplate) {
        startTransition(async () => {
            try {
                const costs = deepCopy<ICostChart[]>(form.getValues(`costs`));
                let cost = costs[index];
                if (!cost) return;
                // console.log(cost);
                if (!cost.startDate) {
                    toast.error("Add a valid starting date");
                    return;
                }
                if (!cost.endDate) {
                    const cIndex = costs.findIndex((c) => c.id && !c.endDate);
                    if (cIndex > -1 && cIndex != index) {
                        toast.error("Only one cost can have empty end date");
                        return;
                    }
                }
                if (community) {
                    cost.meta = calculateCommunitModelCost(
                        cost.meta,
                        data.project?.builder?.meta?.tasks,
                    ) as any;

                    cost.model = data.modelName;
                    const { _id, ..._cost } = cost as any;
                    // if (!_cost.communityModelId)
                    //     _cost.communityModelId = data.id;
                    // if (!_cost.pivotId) _cost.pivotId = data.pivotId;
                    // console.log(form.getValues("includeCompleted"));
                    const c = await _saveCommunitModelCostData(
                        _cost as any,
                        data.id,
                        data.pivotId,
                        form.getValues("includeCompleted"),
                    );
                    form.setValue(`costs.${index}` as any, {
                        ...c,
                        _id: c.id,
                    });
                } else {
                    cost.meta.totalCost = sum(Object.values(cost.meta.costs));
                    console.log(cost.meta.totalCost);
                    cost.model = (data as any).modelNo as any;
                    // console.log([data.id, cost.id, index]);
                    const c = await saveModelCost(cost, data.id);
                    form.setValue(`costs.${index}` as any, c as any);
                    route.refresh();
                }
                toast.success("Saved!");
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    return (
        <>
            <div className="col-span-2 grid gap-2">
                <Label>From</Label>
                <DatePicker
                    className="h-8 w-auto"
                    setValue={(e) =>
                        form.setValue(`costs.${fIndex}.startDate`, e)
                    }
                    value={form.getValues(`costs.${fIndex}.startDate`)}
                />
            </div>

            <div className="col-span-2 grid gap-2">
                <Label>To</Label>
                <DatePicker
                    className="h-8 w-auto"
                    setValue={(e) =>
                        form.setValue(`costs.${fIndex}.endDate`, e)
                    }
                    value={form.getValues(`costs.${fIndex}.endDate`)}
                />
            </div>
            <div className="col-span-5 grid grid-cols-7 bg-slate-100 py-2">
                <Label className="col-span-3 mx-2">Tasks</Label>
                <Label className="col-span-2">Cost ($)</Label>
                <Label className="col-span-2">Tax ($)</Label>
            </div>
            {(community
                ? data?.project?.builder
                : data?.builder
            )?.meta?.tasks?.map((t, _i) => (
                <div key={_i} className="col-span-4 grid grid-cols-7 gap-2">
                    <div className="col-span-3">
                        <Label>{t.name}</Label>
                    </div>
                    <div className="col-span-2">
                        <Input
                            type="number"
                            key="cost"
                            className="h-8"
                            {...form.register(
                                `costs.${fIndex}.meta.costs.${t.uid}`,
                            )}
                        />
                    </div>
                    <div className="col-span-2">
                        <Input
                            type="number"
                            className="h-8"
                            {...form.register(
                                `costs.${fIndex}.meta.tax.${t.uid}`,
                            )}
                        />
                    </div>
                </div>
            ))}
            <div className="col-span-4 my-3 flex space-x-4 border-t pt-2">
                <FormField
                    control={form.control}
                    name={"includeCompleted"}
                    render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <Checkbox
                                    disabled={!community}
                                    checked={field.value as any}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel>Update Completed Tasks</FormLabel>
                        </FormItem>
                    )}
                />
                <div className="flex-1"></div>
                <Btn
                    disabled={!community}
                    className="h-8"
                    isLoading={isSaving}
                    onClick={() => submit(data as any)}
                    size="sm"
                    type="submit"
                >
                    Save
                </Btn>
            </div>
        </>
    );
    // )
    // );
}
const MemoCostForm = memo(CostForm);
export function CostHistory({
    form,
    data,
    changeIndex,
    index,
    community,
}: Props) {
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
        changeIndex(0);
    }
    return (
        <div className="space-y-2 pr-2 sm:w-2/5">
            <div className="">
                <Label>Cost History</Label>
            </div>
            <div className="">
                <Button
                    disabled={fields.some((f) => !f.createdAt) || !community}
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
                    {/* {changing ? "CHANGING" : "CHANGE COMPLETE"} */}
                    {fields.map((f, i) => (
                        <div
                            className="group mr-2 flex items-center space-x-2"
                            key={i}
                        >
                            <Button
                                variant={i == index ? "secondary" : "ghost"}
                                className="flex h-8 w-full cursor-pointer p-0.5 px-2  text-sm hover:bg-slate-200  "
                                onClick={() => {
                                    changeIndex(i);
                                }}
                            >
                                <div className="flex flex-1 justify-between space-x-4">
                                    <div className="text-start">
                                        {f.title || "New Cost"}
                                    </div>
                                    <div>
                                        <Badge className="" variant={"outline"}>
                                            {form.getValues(
                                                `costStats.${f._id}`,
                                            ) || 0}
                                        </Badge>
                                    </div>
                                </div>
                            </Button>
                            <ConfirmBtn
                                disabled={!community}
                                onClick={async () => {
                                    if (index == i && fields.length > 1) {
                                        if (
                                            index > 0 &&
                                            fields.length - 1 == index
                                        )
                                            changeIndex(i - 1);
                                    }
                                    if (fields.length == 1) createCost();
                                    await _deleteCommunityModelCost(f._id);
                                    remove(i);

                                    // changeIndex()
                                }}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    community &&
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
