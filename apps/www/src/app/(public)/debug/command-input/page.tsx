"use client";

import { useState } from "react";

import { Command, CommandInput, CommandList } from "@gnd/ui/command";

export default function CommandInputPage({}) {
    const [v, vc] = useState("");
    return (
        <>
            <Command shouldFilter={false}>
                <CommandInput value={v} onValueChange={vc} />
                <CommandList></CommandList>
            </Command>
        </>
    );
}
