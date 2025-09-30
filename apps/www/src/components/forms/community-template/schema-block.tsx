import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";
import {
    createSchemaBlockContext,
    SchemaBlockProvider,
    useSchemaBlockContext,
    useTemplateBlocksContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { reorderList } from "@gnd/utils";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { useForm } from "react-hook-form";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Popover } from "@gnd/ui/composite";
import { Button, buttonVariants } from "@gnd/ui/button";
import { Card } from "@gnd/ui/composite";
import { TemplateInputConfig } from "./template-input-config";
import { ModelInput } from "./model-input";
import { AddInput } from "./add-input";
import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import { BlockInput } from "./block-input";

interface Props {
    block?;
    children?;
    savingSort?;
}
export function SchemaBlock(props: Props) {
    return (
        <Suspense fallback={<Skeletons.Dashboard />}>
            <SchemaBlockProvider
                value={createSchemaBlockContext({
                    blockId: props.block.id,
                })}
            >
                <FormCard {...props} />

                {props.children}
            </SchemaBlockProvider>
        </Suspense>
    );
}
function FormCard(props: Props) {
    const { block, savingSort } = props;
    const ctx = useTemplateBlocksContext();
    const blk = useSchemaBlockContext();
    const { fields, swap } = blk;
    const { templateEditMode } = ctx;
    if (!templateEditMode && !fields?.length) return null;
    return (
        <Sortable.Item
            value={block._id}
            key={block._id}
            asChild
            className={cn(savingSort && "grayscale", "group")}
        >
            <Card.Root>
                <Card.Header>
                    <Card.Title className="flex gap-4 items-center">
                        {!templateEditMode || (
                            <Sortable.ItemHandle>
                                <Icons.DragIndicator className="size-5 text-[#878787]" />
                            </Sortable.ItemHandle>
                        )}
                        {block?.title}
                        <div className="flex-1"></div>
                        <AddInput />
                    </Card.Title>
                </Card.Header>
                <Card.Content>
                    <FormContent />
                </Card.Content>
            </Card.Root>
        </Sortable.Item>
    );
}
function FormContent({}) {
    const blk = useSchemaBlockContext();

    const ctx = useTemplateBlocksContext();
    const { templateEditMode } = ctx;

    const { fields, swap } = blk;
    const { mutate, isPending: savingSort } = useMutation(
        _trpc.community.updateRecordsIndicesIndices.mutationOptions({
            meta: null,
        }),
    );
    if (!blk.fields?.length) return <EmptyState />;
    const _reorderList = (newFields) => {
        console.log(newFields);
        // return;
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
            orientation="vertical"
            collisionDetection={closestCorners}
            value={fields}
            getItemValue={(item) => item._id}
            onValueChange={_reorderList}
            // overlay={<div className="size-full rounded-md bg-primary/10" />}
        >
            <Sortable.Content
                className={cn(
                    "grid gap-4 grid-cols-4s",
                    templateEditMode ? "gap-6" : "gap-4",
                )}
            >
                {fields.map((input) => (
                    <BlockInput
                        key={input._id}
                        input={input}
                        savingSort={savingSort}
                    />
                ))}
            </Sortable.Content>
            <Sortable.Overlay>
                <div className="pointer-events-none absolute inset-0">
                    <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                </div>
            </Sortable.Overlay>
        </Sortable.Root>
    );
}

export interface SchemaBlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
}

