"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveSettingAction } from "@/app/(v1)/_actions/settings";
import Btn from "@/components/_v1/btn";
import PageHeader from "@/components/_v1/page-header";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { InstallCostMeta, InstallCostSettings } from "@/types/settings";
import { Delete, Move, Plus, Trash } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Form, FormControl, FormField, FormItem } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

import { HousePackageToolSettings } from "../type";
import { saveHousePackageTool } from "./save-house-package-tool";
import { useTransition } from "@/utils/use-safe-transistion";

export type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export function DimensionList({ data }: { data: HousePackageToolSettings }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // react-hook-form
    const form = useForm<HousePackageToolSettings>({
        defaultValues: {
            ...data,
        },
    });
    const { watch, control } = form;
    const { fields, replace, remove, append } = useFieldArray({
        control,
        name: "data.sizes",
    });

    function onSubmit() {
        startTransition(async () => {
            try {
                await saveHousePackageTool(
                    form.getValues("id"),
                    form.getValues("data"),
                );
                toast.success("Saved.");
            } catch (err: any) {
                toast.error(err.message);
            }
        });
    }
    const handleOndragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(fields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem as any);
        replace(items);
    };
    return (
        <Form {...form}>
            <div className="space-y-4">
                <PageHeader
                    title="Dimension Variants"
                    Action={() => (
                        <>
                            <Btn
                                className="h-8"
                                isLoading={isPending}
                                onClick={onSubmit}
                            >
                                Save
                            </Btn>
                        </>
                    )}
                />
                <div className="mx-w-lg">
                    <DragDropContext onDragEnd={handleOndragEnd}>
                        <Droppable droppableId="droppable-1">
                            {(provided) => {
                                return (
                                    <ul
                                        role="list"
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        <div className="grid w-full grid-cols-12">
                                            <div className="col-span-6 border bg-slate-200 p-0.5 px-2">
                                                <Label>Size (ft)</Label>
                                            </div>
                                            <div className="col-span-2 border bg-slate-200 p-0.5 px-2">
                                                <Label>Size (in)</Label>
                                            </div>
                                            <div className="col-span-1 border bg-slate-200 p-0.5 px-2">
                                                <Label>Width</Label>
                                            </div>
                                            {/* <div className="col-span-1 p-0.5 border bg-slate-200 px-2">
                                                <Label>Contractor</Label>
                                            </div> */}
                                            <div className="col-span-1 border bg-slate-200 p-0.5 px-2">
                                                <Label>Height</Label>
                                            </div>
                                            <div className="col-span-1 border bg-slate-200 p-0.5 px-2"></div>
                                        </div>
                                        {fields.map((field, rowIndex) => (
                                            <Draggable
                                                key={rowIndex}
                                                draggableId={field.id}
                                                index={rowIndex}
                                            >
                                                {(provided) => {
                                                    return (
                                                        <div
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            ref={
                                                                provided.innerRef
                                                            }
                                                            key={field.id}
                                                            className="group grid w-full grid-cols-12 items-center  rounded"
                                                        >
                                                            <div className="col-span-6 border">
                                                                <CostInput
                                                                    form={form}
                                                                    formKey={`data.sizes.${rowIndex}.ft`}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 border">
                                                                <CostInput
                                                                    form={form}
                                                                    formKey={`data.sizes.${rowIndex}.in`}
                                                                />
                                                            </div>

                                                            {[
                                                                // "contractor",
                                                                "width",
                                                                "height",
                                                            ].map((k) => (
                                                                <div
                                                                    key={k}
                                                                    className="col-span-1 flex h-7 justify-center border"
                                                                >
                                                                    <FormField
                                                                        control={
                                                                            form.control
                                                                        }
                                                                        name={
                                                                            `data.sizes.${rowIndex}.${k}` as any
                                                                        }
                                                                        render={({
                                                                            field,
                                                                        }) => (
                                                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                                                <FormControl>
                                                                                    <Checkbox
                                                                                        checked={
                                                                                            field.value as any
                                                                                        }
                                                                                        onCheckedChange={
                                                                                            field.onChange
                                                                                        }
                                                                                    />
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </div>
                                                            ))}

                                                            <div className="col-span-1 flex  h-7 items-center space-x-2 border">
                                                                <Move className="mx-2 size-4 text-slate-300 group-hover:text-gray-600" />
                                                                <Button
                                                                    onClick={() => {
                                                                        remove(
                                                                            rowIndex,
                                                                        );
                                                                    }}
                                                                    size="icon"
                                                                    variant="ghost"
                                                                >
                                                                    <Trash className="h-4 w-4 text-slate-300 group-hover:text-red-600" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </ul>
                                );
                            }}
                        </Droppable>
                    </DragDropContext>
                    <Button
                        onClick={() => {
                            append({} as any);
                        }}
                        variant="secondary"
                        className="mt-1 h-7 w-full"
                    >
                        <Plus className="mr-2 size-4" />
                        <span>Add Line</span>
                    </Button>
                </div>
            </div>
        </Form>
    );
}
function CostInput({
    form,
    formKey,
    type = "text",
}: {
    form: any;
    formKey;
    type?;
}) {
    //   const q = form.watch(formKey)
    //   const debouncedQuery = useDebounce(q, 800);
    //   const [watcher,startWatcher] = React.useState(false)
    // React.useEffect(() => {
    //   if(watcher) {

    //   }
    //   console.log(l1)
    // },[debouncedQuery,watcher])

    return (
        <Input
            className="h-7 border-transparent uppercase"
            type={type}
            {...form.register(formKey)}
        />
    );
}
