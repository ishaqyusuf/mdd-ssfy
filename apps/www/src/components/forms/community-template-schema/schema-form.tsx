"use client";
import {
    createTemplateBlocksContext,
    TemplateBlocksProvider,
    useTemplateBlocksContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useAfterState } from "@gnd/ui/hooks/use-after-state";
import { useInventoryParams } from "@/hooks/use-inventory-params";

export function SchemaForm() {
    return (
        <TemplateBlocksProvider value={createTemplateBlocksContext()}>
            <Content />
        </TemplateBlocksProvider>
    );
}
function Content() {
    const ctx = useTemplateBlocksContext();
    const inv = useInventoryParams();
    useAfterState(inv.productId, () => {
        console.log("FINISHED");
    });
    if (!ctx.blocks?.length) return <EmptyState onCreate={(e) => {}} />;
    return <div></div>;
}

