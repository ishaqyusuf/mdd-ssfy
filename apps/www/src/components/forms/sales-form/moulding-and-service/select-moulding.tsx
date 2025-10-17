import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useGroupedItem } from "../context";
import { useState } from "react";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Components } from "../take-off/takeoff-component";

export function SelectMoulding({}) {
    const ctx = useGroupedItem();
    const [open, setOpen] = useState(false);
    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"secondary"}
                        className={cn(
                            "w-full",
                            "border border-transparent hover:border-border text-xs uppercase p-1 h-7 rounded font-mono$ overflow-hidden gap-2",
                        )}
                    >
                        <span>Add Moulding</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto">
                    <Components
                        onSelect={ctx?.addMoulding}
                        components={ctx?.mouldings}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
