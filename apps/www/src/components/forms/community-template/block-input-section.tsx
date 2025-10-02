import { RouterOutputs } from "@api/trpc/routers/_app";
import {
    useTemplateSchemaInputContext,
    useTemplateSchemaBlock,
    useTemplateSchemaContext,
} from "./context";
import { useState } from "react";
import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import * as Sortable from "@gnd/ui/sortable-2";

import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { Button, buttonVariants } from "@gnd/ui/button";
import { ModelInput } from "./model-input";

import { BlockInputConfig } from "./block-input-config";
import { Icons } from "@gnd/ui/icons";
import { useCommunityModelStore } from "@/store/community-model";
import { DuplicateBtn } from "./duplicate-btn";
import { Env } from "@/components/env";

export function BlockInput() {
    const inputCtx = useTemplateSchemaInputContext();
    const { input, savingSort } = inputCtx;
    const [data, setData] = useState(input);

    // const blk = useTemplateSchemaBlock();
    // const { fields, swap } = blk;
    const { setParams } = useCommunityInventoryParams();
    const openAnalytics = () => {
        setParams({
            openCommunityInventoryId: data?.id,
        });
    };
    const ctx = useTemplateSchemaContext();
    const schemaBlock = useTemplateSchemaBlock();
    const { templateEditMode, printMode, modelEditMode } = ctx;
    const store = useCommunityModelStore();
    const Content = (
        <div
            onMouseEnter={(e) => {
                setTimeout(() => {
                    store.update("hoverRow", {
                        blockId: schemaBlock._blockId,
                        rowNo: input?._formMeta.rowNo,
                    });
                }, 300);
            }}
            // onMouseLeave={(e) => {
            //     store.update("hoverRow", {} as any);
            // }}
            className={cn(
                "flex relative gap-4",
                schemaBlock.sortMode
                    ? "col-span-4"
                    : `col-span-${data.columnSize || 4}`,
                savingSort && "grayscale",
                "group",
            )}
        >
            <div className={cn("flex w-[100px] relative justify-end")}>
                {/* <div className="flex-1"></div> */}
                <Env isDev>
                    <div className="absolute">{input?._formMeta?.rowNo}</div>
                </Env>
                <Label
                    onClick={openAnalytics}
                    className={cn(
                        buttonVariants({
                            size: "xs",
                            variant: "link",
                        }),
                        templateEditMode ?? "whitespace-nowrap",
                        "z-20 relative",
                    )}
                >
                    {data.title || data.inv.name}
                </Label>
            </div>
            <div className="flex flex-1 relative">
                {(modelEditMode && printMode) || (
                    <>
                        <ModelInput />
                    </>
                )}
                {(modelEditMode && printMode) || <></>}
                {!templateEditMode || (
                    <>
                        {!templateEditMode || (
                            <Sortable.ItemHandle className="absolute z-10 inset-0 -left-3 top-1">
                                {/* <Icons.DragIndicator className="size-5 text-[#878787]" /> */}
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                                </div>
                            </Sortable.ItemHandle>
                        )}

                        <div className="z-10 absolute right-0">
                            <BlockInputConfig
                                onInputUpdated={setData}
                                data={data}
                            />
                        </div>
                    </>
                )}
            </div>
            <DuplicateBtn />
        </div>
    );
    if (!templateEditMode) return Content;
    return (
        <Sortable.Item value={(input as any)._id} asChild className={cn()}>
            {Content}
        </Sortable.Item>
    );
}

