"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useModal } from "@/components/common/modal/provider";
import { openModal } from "@/lib/modal";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import SubmitJobModal from "../_modals/submit-job-modal";

export default function SubmitJobBtn({}) {
    const { data: session } = useSession({
        required: false,
    });
    const can = session?.can;
    const path = usePathname();
    const [actions, setTabs] = useState(
        [
            can?.viewTech && "punchout",
            can?.viewInstallation && "installation",
            can?.viewDecoShutterInstall && "Deco-Shutter",
        ].filter(Boolean),
    );
    const modal = useModal();
    function open(_type) {
        let type = _type?.toLowerCase();

        modal?.openModal(<SubmitJobModal job={{ type } as any} />);
    }
    if (actions.length == 1)
        return (
            <Button
                onClick={() => {
                    open(actions?.[0]);
                }}
                size="sm"
                className="h-8"
            >
                <Plus className="mr-2 h-4 w-4" />
                <span>Task</span>
            </Button>
        );
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Job</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {actions.map((a) => (
                        <DropdownMenuItem
                            onClick={() => {
                                open(a);
                            }}
                            className="capitalize"
                            key={a?.toString()}
                        >
                            {a}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
