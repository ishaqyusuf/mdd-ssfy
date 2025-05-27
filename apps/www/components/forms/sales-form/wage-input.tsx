import { LineInput } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { AnimatedNumber } from "@/components/animated-number";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

export function WageInput({ lineUid, value, cls, valueChanged }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="xs" variant="outline">
                    <AnimatedNumber value={value || 0} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Labor Cost</h4>
                        <p className="text-sm text-muted-foreground">
                            Labor Cost Per Unit Qty
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="width">Labor/Qty</Label>
                            <LineInput
                                lineUid={lineUid}
                                name="pricing.unitLabor"
                                cls={cls}
                                type="number"
                                valueChanged={valueChanged}
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
