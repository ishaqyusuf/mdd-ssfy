import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";
import {
    BlockInputProvider,
    createTemplateSchemaInputContext,
    createTemplateSchemaBlock,
    SchemaBlockProvider,
    useTemplateSchemaBlock,
    useTemplateSchemaContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { reorderList } from "@gnd/utils";
import { useMutation } from "@gnd/ui/tanstack";
import { _trpc } from "@/components/static-trpc";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Card } from "@gnd/ui/composite";

import { AddInput } from "./add-input-block";

import { BlockInput } from "./block-input-section";
import { Button } from "@gnd/ui/button";
import { SortDescIcon } from "lucide-react";
import { useCommunityModelStore } from "@/store/community-model";
import { SalesBlockCtx } from "@/app/(v2)/printer/sales/sales-print-block";

interface Props {
    block?;
    children?;
    savingSort?;
}
export function SchemaBlock(props: Props) {
    return (
        <Suspense fallback={<Skeletons.Dashboard />}>
            <SchemaBlockProvider
                value={createTemplateSchemaBlock({
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
    const ctx = useTemplateSchemaContext();
    const blk = useTemplateSchemaBlock();
    const { fields, modelFields, setSortMode, sortMode } = blk;
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
                        <Button
                            variant={sortMode ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                                setSortMode(!sortMode);
                            }}
                        >
                            <SortDescIcon className="size-4" />
                        </Button>
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
    const blk = useTemplateSchemaBlock();

    const ctx = useTemplateSchemaContext();
    const { templateEditMode } = ctx;

    const { fields, swap } = blk;
    const { mutate, isPending: savingSort } = useMutation(
        _trpc.community.updateRecordsIndicesIndices.mutationOptions({
            meta: null,
        }),
    );

    const store = useCommunityModelStore();
    const __fields = ctx?.modelSlug
        ? store?.blocks?.[blk.uid]?.inputConfigs
        : fields;
    const _reorderList = (newFields) => {
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
    if (!__fields?.length) return <EmptyState />;

    return (
        <Sortable.Root
            orientation="mixed"
            collisionDetection={closestCorners}
            value={fields}
            getItemValue={(item) => item._id}
            onValueChange={_reorderList}
            // overlay={<div className="size-full rounded-md bg-primary/10" />}
        >
            <Sortable.Content
                className={cn(
                    "grid gap-4 grid-cols-4",
                    templateEditMode ? "gap-6" : "gap-4",
                )}
            >
                {__fields.map((inputField, index) => (
                    <BlockInputProvider
                        value={createTemplateSchemaInputContext({
                            input: inputField,
                            savingSort,
                            store,
                            blockCtx: blk,
                        })}
                        key={ctx?.modelSlug ? index : (inputField as any)._id}
                    >
                        <BlockInput />
                    </BlockInputProvider>
                ))}
            </Sortable.Content>
            <Sortable.Overlay />
        </Sortable.Root>
    );
}

export interface SchemaBlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
    children?;
}

