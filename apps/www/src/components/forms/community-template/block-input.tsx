import { RouterOutputs } from "@api/trpc/routers/_app";
import { useSchemaBlockContext, useTemplateBlocksContext } from "./context";
import { useState } from "react";
import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import * as Sortable from "@gnd/ui/sortable-2";
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
    const blk = useSchemaBlockContext();
    const { fields, swap } = blk;
    const [data, setData] = useState(props.input);
    const ctx = useTemplateBlocksContext();
    const { templateEditMode, printMode, modelEditMode } = ctx;
    const { setParams } = useCommunityInventoryParams();
    const openAnalytics = () => {
        setParams({
            openCommunityInventoryId: data?.id,
        });
    };
    return (
        <Sortable.Item
            value={data.id}
            asChild
            className={cn(
                props.savingSort && "grayscale",
                "group",
                `col-span-${data.columnSize || 4}`,
            )}
        >
            <div className={cn("grid items-center grid-cols-6 gap-4")}>
                <div className="col-span-1 flex justify-end items-center">
                    {!templateEditMode || (
                        <Sortable.ItemHandle>
                            <Icons.DragIndicator className="size-5 text-[#878787]" />
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
                    {/* <div className="flex-1"></div> */}
                    <Label
                        onClick={openAnalytics}
                        className={cn(
                            buttonVariants({
                                size: "xs",
                                variant: "link",
                            }),
                            templateEditMode ?? "whitespace-nowrap",
                        )}
                    >
                        {data.title || data.inv.name}
                    </Label>
                </div>
                <div className="flex col-span-5 gap-2">
                    {(modelEditMode && printMode) || (
                        <>
                            <ModelInput />
                        </>
                    )}
                    {(modelEditMode && printMode) || <></>}
                    {!templateEditMode || (
                        <>
                            <Skeleton className="w-full h-8" />
                            <BlockInputConfig
                                onInputUpdated={setData}
                                data={data}
                            />
                        </>
                    )}
                </div>
            </div>
        </Sortable.Item>
    );
}

