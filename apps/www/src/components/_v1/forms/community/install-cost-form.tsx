"use client";

import { Icons } from "@gnd/ui/icons";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveSettingAction } from "@/app-deps/(v1)/_actions/settings";

import PageHeader from "@/components/_v1/page-header";
import { generateRandomString } from "@/lib/utils";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { InstallCostMeta, InstallCostSettings } from "@/types/settings";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useFieldArray, useForm } from "react-hook-form";

import type { z } from "zod";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Form, FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { useTransition } from "@/utils/use-safe-transistion";
import { SubmitButton } from "@gnd/ui/submit-button";
import { toast } from "@gnd/ui/use-toast";
import { Table } from "@gnd/ui/namespace";
type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export function InstallCostForm({ data }: { data: InstallCostSettings }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // react-hook-form
    const form = useForm<InstallCostMeta>({
        defaultValues: {
            ...(data.meta as any),
        },
    });

    const { watch, control } = form;
    const { fields, replace, remove, append } = useFieldArray({
        control,
        name: "list",
    });

    function onSubmit() {
        startTransition(async () => {
            try {
                const resp = await saveSettingAction(data.id, {
                    meta: {
                        ...((data?.meta || {}) as any),
                        list: form.getValues("list")?.map((list) => {
                            list.uid = list.uid || generateRandomString(4);
                            return list;
                        }),
                    },
                });
                toast({
                    title: "Success",
                    description: "Install Cost Price saved successfully.",
                    variant: "success",
                });
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
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
                    title="Install Cost Price"
                    Action={() => (
                        <>
                            <SubmitButton
                                className="h-8"
                                isSubmitting={isPending}
                                type="button"
                                onClick={onSubmit}
                            >
                                Save
                            </SubmitButton>
                        </>
                    )}
                />
                <div className="mx-w-lg">
                    <DragDropContext onDragEnd={handleOndragEnd}>
                        <Table className="[&_td]:border [&_td]:border-border">
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head className="w-[45%]">
                                        Task
                                    </Table.Head>
                                    <Table.Head className="w-[15%]">
                                        Cost
                                    </Table.Head>
                                    <Table.Head className="w-[10%]">
                                        Max Qty
                                    </Table.Head>
                                    <Table.Head className="w-[10%] text-center">
                                        Punchout
                                    </Table.Head>
                                    <Table.Head className="w-[10%]" />
                                </Table.Row>
                            </Table.Header>

                            <Droppable droppableId="droppable-1">
                                {(provided) => (
                                    <Table.Body
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {fields.map((field, rowIndex) => (
                                            <Draggable
                                                key={field.id}
                                                draggableId={field.id}
                                                index={rowIndex}
                                            >
                                                {(provided) => (
                                                    <Table.Row
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className="group hover:bg-transparent"
                                                    >
                                                        <Table.Cell>
                                                            <CostInput
                                                                form={form}
                                                                formKey={`list.${rowIndex}.title`}
                                                            />
                                                        </Table.Cell>

                                                        <Table.Cell>
                                                            <CostInput
                                                                type="number"
                                                                form={form}
                                                                formKey={`list.${rowIndex}.cost`}
                                                            />
                                                        </Table.Cell>

                                                        <Table.Cell>
                                                            <CostInput
                                                                type="number"
                                                                form={form}
                                                                formKey={`list.${rowIndex}.defaultQty`}
                                                            />
                                                        </Table.Cell>

                                                        <Table.Cell className="text-center">
                                                            <FormField
                                                                control={
                                                                    form.control
                                                                }
                                                                name={`list.${rowIndex}.punchout`}
                                                                render={({
                                                                    field,
                                                                }) => (
                                                                    <Checkbox
                                                                        checked={
                                                                            field.value
                                                                        }
                                                                        onCheckedChange={
                                                                            field.onChange
                                                                        }
                                                                    />
                                                                )}
                                                            />
                                                        </Table.Cell>

                                                        <Table.Cell
                                                            {...provided.dragHandleProps}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Icons.Move className="size-4 text-slate-300 group-hover:text-gray-600" />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    remove(
                                                                        rowIndex,
                                                                    )
                                                                }
                                                            >
                                                                <Icons.Trash className="size-4 text-slate-300 group-hover:text-red-600" />
                                                            </Button>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </Table.Body>
                                )}
                            </Droppable>
                        </Table>
                    </DragDropContext>
                    <Button
                        onClick={() => {
                            append({} as any);
                        }}
                        variant="secondary"
                        className="mt-1 h-7 w-full"
                    >
                        <Icons.Plus className="mr-2 size-4" />
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
    return (
        <Input
            className="h-7 border-transparent uppercase"
            type={type}
            {...form.register(formKey)}
        />
    );
}
