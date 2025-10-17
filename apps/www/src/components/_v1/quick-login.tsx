"use client";

import { useEffect, useState } from "react";
import { getEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import { env } from "@/env.mjs";
import { IUser } from "@/types/hrm";
import { Plus } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import {
    PrimaryCellContent,
    SecondaryCellContent,
} from "./columns/base-columns";

export default function QuickLogin() {
    const [employees, setEmployees] = useState<IUser[]>([]);
    async function init() {
        const e = await getEmployees({
            per_page: 1000,
        });
        setEmployees(e.data as any);
    }
    useEffect(() => {
        init();
    }, []);
    async function login(e) {
        await signIn("credentials", {
            email: e.email,
            password: env.NEXT_PUBLIC_SUPER_PASS,
            callbackUrl: "/",
            redirect: true,
        });
    }
    return (
        <div className="abslute right-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="secondary"
                        className="flex h-8  data-[state=open]:bg-muted"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className=" h-56 overflow-auto"
                >
                    {employees?.map((e) => (
                        <DropdownMenuItem onClick={() => login(e)} key={e.id}>
                            <div className="">
                                <PrimaryCellContent>
                                    {e.name}
                                </PrimaryCellContent>
                                <SecondaryCellContent>
                                    {e.role?.name}
                                </SecondaryCellContent>
                            </div>
                            <div className="">
                                <SecondaryCellContent>
                                    {e.email}
                                </SecondaryCellContent>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
