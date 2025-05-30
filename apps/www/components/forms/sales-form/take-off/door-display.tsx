import { ComponentImg } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/component-img";
import { useTakeoffItem } from "./context";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { DoorSelect } from "./door-select";

export function DoorDisplay({}) {
    const item = useTakeoffItem();

    const Component = <ComponentImg aspectRatio={0.9} src={item.door?.img} />;
    const [open, setOpen] = useState(false);
    if (!item.section) return Component;
    return (
        <div className="flex items-center h-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger className="flex-1 hover:shadow hover:rounded-lg hover:border overflow-hidden relative">
                    {Component}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <DoorSelect setOpen={setOpen} />
                </PopoverContent>
            </Popover>
        </div>
    );
}
export function DoorTitle({}) {
    const item = useTakeoffItem();

    return (
        <div className="line-clamp-2 text-sm font-bold font-mono">
            {item?.door?.title}
        </div>
    );
}
