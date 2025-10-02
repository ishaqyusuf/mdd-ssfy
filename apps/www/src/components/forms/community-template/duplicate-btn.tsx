import { Button } from "@gnd/ui/button";
import {
    useTemplateSchemaBlock,
    useTemplateSchemaInputContext,
} from "./context";
import { Icons } from "@gnd/ui/icons";
import { cn } from "@gnd/ui/cn";
import { useCommunityModelStore } from "@/store/community-model";
import { duplicateRow } from "@community/utils/template-form";
export function DuplicateBtn() {
    const inputCtx = useTemplateSchemaInputContext();
    const blk = useTemplateSchemaBlock();
    const store = useCommunityModelStore();
    const hov = store.hoverRow;
    const inputUid = inputCtx.input.uid;
    if (inputUid?.includes("-")) return null;
    if (!inputCtx.input?._formMeta?.rowEdge) return null;
    const show =
        blk?._blockId == hov?.blockId &&
        hov?.rowNo == inputCtx?.input?._formMeta?.rowNo;
    const input = inputCtx.input;
    return (
        <div className={cn("absolute -right-10 z-10", show || "hidden")}>
            <Button
                onClick={(e) => {
                    store.update(
                        `blocks.${blk._blockId}.inputConfigs`,
                        duplicateRow(
                            input._formMeta.rowNo,
                            store.blocks?.[blk._blockId]?.inputConfigs,
                        ),
                    );
                }}
                className=""
                size="xs"
                variant="secondary"
            >
                <Icons.Copy className="size-4" />
            </Button>
        </div>
    );
}

