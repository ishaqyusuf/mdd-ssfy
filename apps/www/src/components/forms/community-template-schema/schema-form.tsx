"use client";
import {
    createTemplateBlocksContext,
    TemplateBlocksProvider,
    useTemplateBlocksContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Reorder } from "framer-motion";
import { reorderList } from "@gnd/utils";
import { useFieldArray } from "react-hook-form";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { SchemaBlock } from "./schema-block";
import { AddInput } from "./add-input";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { cn } from "@gnd/ui/cn";

export function SchemaForm({ children }) {
    return (
        <TemplateBlocksProvider value={createTemplateBlocksContext()}>
            <Content />
            {children}
        </TemplateBlocksProvider>
    );
}
function Content() {
    const ctx = useTemplateBlocksContext();
    const inv = useInventoryParams();
    // useAfterState(inv.productId, () => {
    //     console.log("FINISHED");
    // });
    const { isReorderable } = ctx;
    const { fields, swap } = useFieldArray({
        control: ctx.form.control,
        name: "blocks",
        keyName: "_id",
    });
    const _reorderList = (newFields: typeof fields) => {
        reorderList({
            newFields,
            oldFields: fields,
            swap,
        });
        mutate({
            recordName: "communityTemplateBlockConfig",
            records: newFields.map((f, i) => ({
                id: f.id,
                index: i,
            })),
        });
    };
    const { mutate, isPending: savingSort } = useMutation(
        _trpc.community.updateRecordsIndicesIndices.mutationOptions({
            meta: null,
        }),
    );
    if (!ctx.blocks?.length) return <EmptyState onCreate={(e) => {}} />;
    return (
        <div className="">
            {/* <Reorder.Group
                axis="y"
                values={fields}
                onReorder={_reorderList}
                className="!m-0"
            > */}
            <Sortable.Root
                orientation="vertical"
                collisionDetection={closestCorners}
                value={fields}
                getItemValue={(item) => item._id}
                onValueChange={_reorderList}
                // overlay={<div className="size-full rounded-md bg-primary/10" />}
            >
                <Sortable.Content className="grid">
                    {fields.map((block) => (
                        <Sortable.Item
                            // value={block}
                            // className="group"
                            // key={block._id}
                            value={block.id}
                            key={block._id}
                            asChild
                            className={cn(savingSort && "grayscale", "group")}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex gap-4 items-center">
                                        <Sortable.ItemHandle>
                                            <Icons.DragIndicator className="size-5 text-[#878787]" />
                                        </Sortable.ItemHandle>
                                        {/* {!isReorderable || (
                                        <Button
                                            type="button"
                                            className="sopacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent cursor-grab"
                                            // onPointerDown={(e) =>
                                            //     controls.start(e)
                                            // }
                                            variant="ghost"
                                        >
                                            <Icons.DragIndicator className="size-5 text-[#878787]" />
                                        </Button>
                                    )} */}
                                        {block?.title}
                                        <div className="flex-1"></div>
                                        <div id={`block${block.id}`} />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <SchemaBlock blockId={block.id}>
                                        <AddInput nodeId={`block${block.id}`} />
                                    </SchemaBlock>
                                </CardContent>
                            </Card>
                        </Sortable.Item>
                    ))}
                </Sortable.Content>
            </Sortable.Root>
            {/* </Reorder.Group> */}
        </div>
    );
}

