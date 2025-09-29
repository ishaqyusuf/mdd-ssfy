"use client";
import {
    createTemplateBlocksContext,
    CreateTemplateBlocksContextProps,
    TemplateBlocksProvider,
    useTemplateBlocksContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { reorderList } from "@gnd/utils";
import { useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { SchemaBlock } from "./schema-block";
import * as Sortable from "@gnd/ui/sortable-2";
import { closestCorners } from "@dnd-kit/core";
import { PageTitle } from "@gnd/ui/custom/page-title";

interface Props extends CreateTemplateBlocksContextProps {
    children?;
}
export function CommunityTemplateForm({ children, ...props }: Props) {
    return (
        <TemplateBlocksProvider value={createTemplateBlocksContext(props)}>
            {children}
            <Content />
        </TemplateBlocksProvider>
    );
}
function Content() {
    const ctx = useTemplateBlocksContext();
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
            <PageTitle>{ctx?.modelSlug || "Template Schema"}</PageTitle>
        </div>
    );
}

