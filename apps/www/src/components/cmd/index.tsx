"use client";
import React, { useState } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@gnd/ui/command";
import Link from "next/link";
import useCommands from "./commands";
import { useCmd } from "./provider";
import { usePathname, useRouter } from "next/navigation";

export function Cmd() {
    const [open, setOpen] = React.useState(false);
    const commands = useCommands();
    const cmd = useCmd();
    const path = usePathname();

    const route = useRouter();
    const [specialCmds, setSpecialCmds] = useState<any[]>([]);
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const metaKey = e.metaKey || e.altKey;
            if (metaKey) {
                switch (e.key) {
                    case "o":
                        e.preventDefault();
                        route.push(`/sales/edit/order/new`);
                        break;
                    case "e":
                        e.preventDefault();
                        route.push(`/sales/edit/quote/new`);
                        break;
                }
            }
            if (e.key === "k" && (e.metaKey || e.altKey)) {
                // console.log(route.pathname);
                // console.log(path);
                let sc = [];
                e.preventDefault();
                if (cmd.form) {
                    const k = `pageActions.${path}`;
                    const { commands } = cmd.form.getValues(k) || {};
                    sc = commands || [];
                    console.log(k);
                }
                setSpecialCmds(sc);
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [path]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    {specialCmds.map((cmdItem, i) => (
                        <CommandItem
                            onSelect={(e) => {
                                cmdItem.action && cmdItem.action();
                            }}
                            key={i}
                        >
                            {cmdItem.title}
                        </CommandItem>
                    ))}

                    {commands.commands.map((cmd, i) => (
                        <Link
                            onClick={() => setOpen(false)}
                            key={i}
                            href="/sales/edit/order/new"
                        >
                            <CommandItem
                                onClick={(e) => {
                                    console.log("....");
                                }}
                            >
                                {<cmd.Icon className="mr-2 h-4 w-4" />}
                                <span>{cmd.title}</span>
                                {cmd.shortCut && (
                                    <CommandShortcut>
                                        ⌘{cmd.shortCut}
                                    </CommandShortcut>
                                )}
                            </CommandItem>
                        </Link>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
