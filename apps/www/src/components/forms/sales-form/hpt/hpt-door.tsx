import { ComponentImg } from "@/components/forms/sales-form/component-img";
import {
    getDoorItemTypeOptions,
    openDoorItemTypeSwapModal,
    openDoorSwapModal,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { HptContext, useHpt } from "@/components/forms/sales-form/context";

interface DoorProps {
    door: HptContext["doors"][number];
}
export function Door({ door }: DoorProps) {
    const ctx = useHpt();
    const itemTypeOptions = getDoorItemTypeOptions(ctx.hpt.itemUid, door.uid);

    return (
        <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {door.title}
                        </p>
                        <p className="text-xs text-slate-500">
                            Door option for this package
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600"
                    >
                        Active
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => {
                            openDoorSwapModal(door, ctx.hpt.itemUid);
                        }}
                    >
                        Change Door
                    </Button>
                    {itemTypeOptions.length > 1 ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => {
                                openDoorItemTypeSwapModal(door, ctx.hpt.itemUid);
                            }}
                        >
                            Swap Item Type ({itemTypeOptions.length})
                        </Button>
                    ) : null}
                </div>
            </div>
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                <div className="w-full max-w-[220px]">
                    <ComponentImg noHover aspectRatio={0.7} src={door.img} />
                </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Size pricing and quantities update the package total instantly.
            </div>
        </div>
    );
}
