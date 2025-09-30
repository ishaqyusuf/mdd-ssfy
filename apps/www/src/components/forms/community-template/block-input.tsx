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
import { GripVertical } from "lucide-react";

export interface SchemaBlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
}
export function BlockInput(props: SchemaBlockInputProps) {
    // const blk = useSchemaBlockContext();
    // const { fields, swap } = blk;
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
        <Sortable.Item
            value={(props.input as any)._id}
            asChild
            className={cn()}
        >
            {/* <Content {...props} /> */}
            <div
                className={cn(
                    "flex relative gap-4",
                    `col-span-${data.columnSize || 4}`,
                    props.savingSort && "grayscale",
                    "group",
                )}
            >
                <div className={cn("flex w-[100px] justify-end")}>
                    {/* <div className="flex-1"></div> */}

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
            </div>
        </Sortable.Item>
    );
}

