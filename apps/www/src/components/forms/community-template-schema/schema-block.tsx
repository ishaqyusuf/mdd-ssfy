import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense, useEffect, useState } from "react";
import {
    createSchemaBlockContext,
    SchemaBlockProvider,
    useSchemaBlockContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { reorderList } from "@gnd/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { useForm } from "react-hook-form";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Popover } from "@gnd/ui/composite";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { inputSizes } from "@community/utils";

interface Props {
    blockId: number;
    children?;
}
export function SchemaBlock(props: Props) {
    return (
        <Suspense fallback={<Skeletons.Dashboard />}>
            <SchemaBlockProvider
                value={createSchemaBlockContext({
                    blockId: props.blockId,
                })}
            >
                <FormContent />
                {props.children}
            </SchemaBlockProvider>
        </Suspense>
    );
}

function FormContent({}) {
    const blk = useSchemaBlockContext();
    const { fields, swap, isReorderable } = blk;
    const { mutate, isPending: savingSort } = useMutation(
        _trpc.community.updateRecordsIndicesIndices.mutationOptions({
            meta: null,
        }),
    );
    if (!blk.fields?.length) return <EmptyState onCreate={(e) => {}} />;
    const _reorderList = (newFields: typeof fields) => {
        reorderList({
            newFields,
            oldFields: fields,
            swap,
        });
        mutate({
            recordName: "communityTemplateInputConfig",
            records: newFields.map((f, i) => ({
                id: f.id,
                index: i,
            })),
        });
    };
    return (
        <Sortable.Root
            orientation="mixed"
            collisionDetection={closestCorners}
            value={fields}
            getItemValue={(item) => item._id}
            onValueChange={_reorderList}
            // overlay={<div className="size-full rounded-md bg-primary/10" />}
        >
            <Sortable.Content className="grid gap-4 grid-cols-4">
                {fields.map((input) => (
                    <SchemaBlockInput
                        key={input._id}
                        input={input}
                        savingSort={savingSort}
                    />
                ))}
            </Sortable.Content>
            <Sortable.Overlay />
        </Sortable.Root>
    );
}

interface SchemaBlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
}
function SchemaBlockInput(props: SchemaBlockInputProps) {
    const blk = useSchemaBlockContext();
    const { input } = props;
    const { fields, swap, isReorderable } = blk;
    const [data, setData] = useState(input);
    return (
        <Sortable.Item
            value={input.id}
            key={(input as any)._id}
            asChild
            className={cn(
                props.savingSort && "grayscale",
                "group",
                `col-span-${input.columnSize || 4}`,
            )}
        >
            <div className="grid items-center grid-cols-6 gap-4">
                <div className="col-span-1 flex justify-end items-center gap-2">
                    {!isReorderable || (
                        <Sortable.ItemHandle>
                            <Icons.DragIndicator className="size-5 text-[#878787]" />
                        </Sortable.ItemHandle>
                        // <Button
                        //     type="button"
                        //     className="sopacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent cursor-grab"
                        //     // onPointerDown={(e) =>
                        //     //     controls.start(e)
                        //     // }
                        //     variant="ghost"
                        // >
                        //     <Icons.DragIndicator className="size-5 text-[#878787]" />
                        // </Button>
                    )}
                    {/* <div className="flex-1"></div> */}
                    <Label className="whitespace-nowrap">
                        {data.title || input.inv.name}
                    </Label>
                </div>
                <div className="flex col-span-5 gap-2">
                    <Skeleton className="w-full" />
                    <Popover.Root>
                        <Popover.Trigger asChild>
                            <Button size="sm" variant="secondary">
                                <Icons.Edit className="size-4" />
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content className="w-80">
                            <InputEditor input={data} />
                        </Popover.Content>
                    </Popover.Root>
                </div>
            </div>
        </Sortable.Item>
    );
}

function InputEditor(props: SchemaBlockInputProps) {
    const { input } = props;
    const form = useForm({
        defaultValues: {
            ...input,
        },
    });
    const w = form.watch();
    const onSubmit = () => {};
    return (
        <div className="grid gap-4">
            <div className="space-y-2">
                <h4 className="leading-none font-medium">Input Config</h4>
                <p className="text-muted-foreground text-sm">
                    update how you interface with {`${input.title}`}
                </p>
            </div>
            <Form {...form}>
                <form
                    className="grid gap-2"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Width</Label>
                        <div className="col-span-2">
                            {[...Array(4)].map((a, i) => (
                                <Button
                                    onClick={(e) => {
                                        form.setValue("columnSize", i + 1);
                                    }}
                                    variant={
                                        w?.columnSize >= i + 1
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    size="sm"
                                    className=""
                                >
                                    <span>{inputSizes[i]}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}

