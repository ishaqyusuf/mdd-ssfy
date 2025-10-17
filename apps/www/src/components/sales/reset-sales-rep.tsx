"use client";

import { Env } from "@/components/env";
import { Button } from "@gnd/ui/button";

export function ResetSalesRep({}) {
    return (
        <Env isDev>
            <div className="">
                <Button>Reset Sales Rep</Button>
            </div>
        </Env>
    );
}
