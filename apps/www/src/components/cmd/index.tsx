"use client";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@gnd/ui/command";
import Link from "@/components/link";
import useCommands from "./commands";

type CmdProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specialCmds: any[];
};

export function Cmd({ open, onOpenChange, specialCmds }: CmdProps) {
    const commands = useCommands();

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
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
                            onClick={() => onOpenChange(false)}
                            key={i}
                            href={cmd.link}
                        >
                            <CommandItem onClick={(e) => {}}>
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
