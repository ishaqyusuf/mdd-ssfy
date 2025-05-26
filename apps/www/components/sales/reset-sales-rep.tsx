"use client";

import DevOnly from "@/_v2/components/common/dev-only";
import { Button } from "@gnd/ui/button";

export function ResetSalesRep({}) {
    return (
        <DevOnly>
            <div className="">
                <Button>Reset Sales Rep</Button>
            </div>
        </DevOnly>
    );
}
