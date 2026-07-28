"use client";

import { createQuickLoginToken } from "@/app-deps/(v1)/_actions/auth";
import { Avatar } from "@/components/avatar";
import { signIn } from "@/lib/auth/client";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useQuery } from "@gnd/ui/tanstack";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function QuickLogin() {
    const trpc = useTRPC();
    const data = useQuery(
        trpc.hrm.getEmployees.queryOptions({
            size: 999,
        }),
    );
    const searchParams = useSearchParams();
    const callbackUrl = getLoginCallbackUrl(searchParams);
    const [error, setError] = useState<string | null>(null);
    const loginableUsers = useMemo(
        () =>
            (data?.data?.data ?? []).filter(
                (user) => typeof user.email === "string" && user.email.trim(),
            ),
        [data?.data?.data],
    );

    async function login(user) {
        setError(null);

        try {
            if (!user?.email) {
                throw new Error("This employee does not have an email address.");
            }

            const token = await createQuickLoginToken(user.email);
            const result = await signIn("credentials", {
                token,
                callbackUrl,
                redirect: false,
            });

            if (!result.ok) {
                throw new Error(result.error || "Quick login failed.");
            }

            window.location.assign(result.url || callbackUrl);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Quick login failed. Try another employee or use email and password.";

            setError(message);
            toast.error(message);
        }
    }
    return (
        <div className="flex flex-col gap-3">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                        <span className="inline-flex items-center gap-2">
                            <Icons.UserRound data-icon="inline-start" />
                            Quick Login
                        </span>
                        <Badge variant="secondary">{loginableUsers.length}</Badge>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-96 p-0">
                    <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
                        <span>Employees</span>
                        <Badge variant="outline">Dev access</Badge>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-80">
                        <div className="flex flex-col gap-1 p-1">
                            {loginableUsers.map((user) => {
                                const role = user?.role || null;

                                return (
                                    <DropdownMenuItem
                                        key={user?.id}
                                        className="items-start gap-3 rounded-md p-2"
                                        onClick={() => login(user)}
                                    >
                                        <Avatar
                                            name={user?.name}
                                            email={user?.email}
                                            className="size-9"
                                            fallbackClassName="text-xs"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium">
                                                    {user?.name || "Unnamed employee"}
                                                </p>
                                                <Badge
                                                    variant={role ? "secondary" : "outline"}
                                                    className="shrink-0"
                                                >
                                                    {role || "No role"}
                                                </Badge>
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user?.email}
                                            </p>
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>
            {error ? (
                <Alert variant="destructive" className="py-3">
                    <Icons.AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
}

function getLoginCallbackUrl(searchParams: URLSearchParams) {
    const returnTo = searchParams.get("return_to");
    if (returnTo?.startsWith("/")) {
        return returnTo;
    }

    return "/";
}
