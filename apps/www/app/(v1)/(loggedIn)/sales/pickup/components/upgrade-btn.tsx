"use client";

import { env } from "@/env.mjs";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

import { upgradeDeliveries } from "../_action/upgrade-deliveries";

export default function UpgradeBtn() {
    if (env.NEXT_PUBLIC_NODE_ENV === "production") return null;
    return (
        <div>
            <Button
                onClick={() => {
                    // upgradeDeliveries().then((d) => {
                    //     toast.success("Done!");
                    //     console.log(d);
                    // });
                }}
            >
                Upgrade
            </Button>
        </div>
    );
}
