"use client";

import { useEffect } from "react";

import { Button } from "@gnd/ui/button";

import { stepUpdateDebug } from "./debug-steps";

export default function MigrateStepDuplicateUid({ data = null }) {
    useEffect(() => {}, []);
    return (
        <>
            <Button
                onClick={async () => {
                    const resp = await stepUpdateDebug();
                    console.log(resp);
                }}
            >
                Step UID
            </Button>
        </>
    );
}
