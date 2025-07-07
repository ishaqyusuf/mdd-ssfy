"use client";

import { useSalesFormFeatureParams } from "@/hooks/use-sales-form-feature-params";

import { Button } from "@gnd/ui/button";

import Portal from "../../_v1/portal";

export function SalesFormFeatureSwitch() {
    const { params, setParams } = useSalesFormFeatureParams();
    return null;
    return (
        <Portal nodeId={"navRightSlot"}>
            <Button
                onClick={(e) => {
                    setParams(
                        params.legacyMode
                            ? null
                            : {
                                  legacyMode: true,
                              },
                    );
                }}
                className="gradient-border relative  h-8   overflow-hidden rounded-lg"
                size="sm"
            >
                {!params.legacyMode ? "v1" : "v1.2"}
            </Button>
        </Portal>
    );
}
