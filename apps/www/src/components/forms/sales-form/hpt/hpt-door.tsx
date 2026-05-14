import { ComponentImg } from "@/components/forms/sales-form/component-img";
import {
    getDoorItemTypeOptions,
    openDoorItemTypeSwapModal,
    openDoorSwapModal,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import { HptContext, useHpt } from "@/components/forms/sales-form/context";

interface DoorProps {
    door: HptContext["doors"][number];
}
export function Door({ door }: DoorProps) {
    const ctx = useHpt();
    const itemTypeOptions = getDoorItemTypeOptions(ctx.hpt.itemUid, door.uid);

    return (
        <div className="relative flex h-full min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm shadow-slate-200/70">
            <TooltipProvider delayDuration={120}>
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                className="size-8 rounded-full"
                                aria-label="Change door"
                                onClick={() => {
                                    openDoorSwapModal(door, ctx.hpt.itemUid);
                                }}
                            >
                                <Icons.Change className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="px-2 py-1 text-xs">
                            Change door
                        </TooltipContent>
                    </Tooltip>
                    {itemTypeOptions.length > 1 ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="size-8 rounded-full border-slate-200 bg-white"
                                    aria-label={`Swap item type, ${itemTypeOptions.length} options`}
                                    onClick={() => {
                                        openDoorItemTypeSwapModal(
                                            door,
                                            ctx.hpt.itemUid,
                                        );
                                    }}
                                >
                                    <Icons.Repeat className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="left"
                                className="px-2 py-1 text-xs"
                            >
                                Swap item type ({itemTypeOptions.length})
                            </TooltipContent>
                        </Tooltip>
                    ) : null}
                </div>
            </TooltipProvider>
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-[200px]">
                    <ComponentImg noHover aspectRatio={0.7} src={door.img} />
                </div>
            </div>
        </div>
    );
}
