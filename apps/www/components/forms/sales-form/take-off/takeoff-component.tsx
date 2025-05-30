import { Button } from "@gnd/ui/button";
import { useTakeoff, useTakeoffItem } from "./context";
import {
    ComponentHelperClass,
    StepHelperClass,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { useAsyncMemo } from "use-async-memo";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Label } from "@gnd/ui/label";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { useState } from "react";
import { Switch } from "@gnd/ui/switch";
import { ComponentImg } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/component-img";

export function TakeOffComponent({ itemStepUid }) {
    const itemCtx = useTakeoffItem();
    const tCtx = useTakeoff();
    const stepForm = tCtx.zus.kvStepForm[`${itemStepUid}`];
    const [open, setOpen] = useState(false);
    if (stepForm?.title == "House Package Tool") return null;
    if (stepForm?.title == "Door") return null;
    if (stepForm?.title == "Height") return null;
    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={!stepForm?.value ? "secondary" : "default"}
                        className={cn(
                            "border border-transparent hover:border-border text-xs uppercase p-1 h-7 rounded font-mono",
                            stepForm?.value
                                ? "font-medium"
                                : "text-muted-foreground",
                        )}
                    >
                        <TextWithTooltip
                            className="max-w-[100px] lg:max-w-[150px] xl:max-w-[200px]"
                            text={stepForm?.value || `${stepForm?.title}:`}
                        />
                        {/* {stepForm?.value || stepForm?.title} */}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto">
                    <Components setOpen={setOpen} itemStepUid={itemStepUid} />
                </PopoverContent>
            </Popover>
        </div>
    );
}
function Components({ itemStepUid, setOpen }) {
    const item = useTakeoffItem();
    const data = useAsyncMemo(async () => {
        const stepClass = new StepHelperClass(itemStepUid);
        const components = await stepClass.fetchStepComponents();

        return {
            components: components?.filter((a) => a._metaData.visible),
        };
    }, [item.itemUid, itemStepUid]);
    const [grid, setGrid] = useState(false);
    return (
        <div
            className={cn(
                "transition-all duration-300",
                grid ? "w-[500px]" : "w-[200px]",
            )}
        >
            <DataSkeletonProvider
                value={
                    {
                        loading: !data?.components,
                    } as any
                }
            >
                {!data?.components ? (
                    <></>
                ) : (
                    <div className="">
                        <div className="flex justify-end p-2 border-b">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={!grid}
                                    onCheckedChange={(e) => setGrid(!e)}
                                    className="h-5"
                                    id="airplane-mode"
                                />
                                <Label htmlFor="airplane-mode">List Mode</Label>
                            </div>
                        </div>
                        <ComboboxDropdown
                            className=""
                            noSearch
                            listClassName={cn(
                                grid &&
                                    "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                            )}
                            onSelect={(data) => {
                                const comp = new ComponentHelperClass(
                                    itemStepUid,
                                    data.data.uid,
                                    data.data,
                                );
                                comp.selectComponent(true);
                                setOpen(false);
                            }}
                            headless
                            items={data?.components?.map((c) => ({
                                label: c.title,
                                id: c.id?.toString(),
                                data: c,
                            }))}
                            placeholder="Select"
                            renderListItem={(item) =>
                                grid ? (
                                    <div className="flex flex-col w-full items-center justify-center gap-4">
                                        <div className="size-16">
                                            <ComponentImg
                                                aspectRatio={0.9}
                                                src={item?.item?.data?.img}
                                            />
                                        </div>
                                        <Label className="text-muted-foreground uppercase text-xs font-mono whitespace-nowrap">
                                            {item?.item?.label}
                                        </Label>
                                    </div>
                                ) : (
                                    <>
                                        <Label>{item?.item?.label}</Label>
                                    </>
                                )
                            }
                        />
                    </div>
                )}
            </DataSkeletonProvider>
        </div>
    );
}
