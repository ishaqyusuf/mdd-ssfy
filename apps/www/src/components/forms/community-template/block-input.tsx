import { RouterOutputs } from "@api/trpc/routers/_app";
import { useSchemaBlockContext, useTemplateBlocksContext } from "./context";
import { useState } from "react";
import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import * as Sortable from "@gnd/ui/sortable-2";
import { useSortableItemContext } from "@gnd/ui/sortable-2";

import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Button, buttonVariants } from "@gnd/ui/button";
import { ModelInput } from "./model-input";
import { Skeleton } from "@gnd/ui/skeleton";
import { Popover } from "@gnd/ui/composite";
import { TemplateInputConfig } from "./template-input-config";
import { BlockInputConfig } from "./block-input-config";

export interface SchemaBlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
}
export function BlockInput(props: SchemaBlockInputProps) {
    // const blk = useSchemaBlockContext();
    // const { fields, swap } = blk;

    return (
        <Sortable.Item
            value={(props.input as any)._id}
            asChild
            className={cn(props.savingSort && "grayscale", "group")}
        >
            <Content {...props} />
        </Sortable.Item>
    );
}

function Content(props) {
    // const { isDragging } = useSortableItemContext("SortableItem");
    const { setParams } = useCommunityInventoryParams();
    const [data, setData] = useState(props.input);
    const openAnalytics = () => {
        setParams({
            openCommunityInventoryId: data?.id,
        });
    };
    const ctx = useTemplateBlocksContext();
    const { templateEditMode, printMode, modelEditMode } = ctx;
    return (
        <div
            className={cn("flex  relative", `col-span-${data.columnSize || 4}`)}
        >
            <div className={cn("col-span-1s")}>
                {/* <div className="flex-1"></div> */}

                {!templateEditMode || (
                    <Sortable.ItemHandle
                        onClick={(e) => {
                            // e.preventDefault();
                        }}
                        className="absolute cursor-pointer z-10 inset-0"
                    >
                        {/* <Icons.DragIndicator className="size-5 text-[#878787]" /> */}
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
                <Label
                    onClick={openAnalytics}
                    className={cn(
                        buttonVariants({
                            size: "xs",
                            variant: "link",
                        }),
                        templateEditMode ?? "whitespace-nowrap",
                        "w-[100px] z-20 relative",
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
                        <div className="pointer-events-none absolute inset-0">
                            <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                        </div>
                        <div className="w-full border h-8">
                            <div className="z-10 absolute right-0">
                                <BlockInputConfig
                                    onInputUpdated={setData}
                                    data={data}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

