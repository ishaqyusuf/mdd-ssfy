"use client";
import {
    createTemplateSchemaContext,
    CreateTemplateSchemaContextProps,
    TemplateBlocksProvider,
    useTemplateSchemaContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { reorderList } from "@gnd/utils";
import { useFieldArray } from "react-hook-form";
import { useMutation } from "@gnd/ui/tanstack";
import { _trpc } from "@/components/static-trpc";
import { SchemaBlock } from "./block-section";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { PageTitle } from "@gnd/ui/custom/page-title";

interface Props extends CreateTemplateSchemaContextProps {
    children?;
}
export function CommunityTemplateForm({ children, ...props }: Props) {
    return (
        <TemplateBlocksProvider value={createTemplateSchemaContext(props)}>
            {children}
            <Content />
        </TemplateBlocksProvider>
    );
}
function Content() {
    const ctx = useTemplateSchemaContext();
    const inv = useInventoryParams();
    // useAfterState(inv.productId, () => {
    //     console.log("FINISHED");
    // });
    const { templateEditMode } = ctx;
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
            records: (newFields as any).map((f, i) => ({
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
    if (!ctx.blocks?.length) return <EmptyState />;
    return (
        <div className="pb-36">
            <PageTitle>
                {ctx?.communityTemplate?.title || "Template Schema"}
            </PageTitle>

            <Sortable.Root
                orientation="mixed"
                collisionDetection={closestCorners}
                value={fields}
                getItemValue={(item) => item._id}
                onValueChange={_reorderList}
            >
                <Sortable.Content className="grid sgrid-cols-3 gap-4">
                    {fields.map((field) => (
                        <SchemaBlock key={field._id} block={field} />
                    ))}
                </Sortable.Content>
                <Sortable.Overlay />
            </Sortable.Root>
        </div>
    );
}

