"use client";

import * as React from "react";
import Link from "next/link";
import { resetPasswordRequest } from "@/app-deps/(v1)/_actions/auth";
import { Menu } from "@/components/(clean-code)/menu";
import { Env } from "@/components/env";
import { Icons } from "@gnd/ui/icons";
import { checkEmailSchema } from "@/lib/validations/auth";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@gnd/ui/tanstack";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@gnd/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@gnd/ui/input-group";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useTransition } from "@/utils/use-safe-transistion";

export type ResetPasswordRequestInputs = z.infer<typeof checkEmailSchema>;

function DevPasswordResetAccountSelector({
    onSelectEmail,
}: {
    onSelectEmail: (email: string) => void;
}) {
    const trpc = useTRPC();
    const data = useQuery(
        trpc.hrm.getEmployees.queryOptions({
            size: 999,
        }),
    );

    return (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Dev accounts
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Pick an account to fill the reset email.
                    </p>
                </div>
                <Menu label="Select account" noSize className="w-[260px]">
                    <ScrollArea className="max-h-[240px] overflow-auto">
                        {data?.data?.data?.map((user) => (
                            <Menu.Item
                                onClick={() => {
                                    if (user.email) onSelectEmail(user.email);
                                }}
                                key={user?.id}
                            >
                                <div className="grid min-w-0 gap-0.5">
                                    <p className="truncate text-sm font-medium">
                                        {user?.name || user?.email}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </Menu.Item>
                        ))}
                    </ScrollArea>
                </Menu>
            </div>
        </div>
    );
}

export function ResetPasswordForm() {
    const [submittedEmail, setSubmittedEmail] = React.useState("");

    const form = useForm<ResetPasswordRequestInputs>({
        resolver: zodResolver(checkEmailSchema as any) as any,
        defaultValues: {
            email: "",
        },
    });

    const [isPending, startTransition] = useTransition();

    async function onSubmit(data: ResetPasswordRequestInputs) {
        startTransition(async () => {
            try {
                await resetPasswordRequest(data);
                setSubmittedEmail(data.email);
                toast.success("Check your email", {
                    description:
                        "If an account exists, we sent a password reset link.",
                });
            } catch (err: any) {
                toast.error(
                    err.message ?? "Unable to send password reset link",
                );
            }
        });
    }

    if (submittedEmail) {
        return (
            <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm leading-6 text-foreground">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Icons.CheckCircle2 className="size-4" />
                        Check your email
                    </div>
                    <p>
                        If an account exists for {submittedEmail}, a secure
                        reset link is on its way. The link expires in 1 hour.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <Button asChild className="h-12 rounded-lg">
                        <Link href="/login">Back to login</Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-lg"
                        onClick={() => setSubmittedEmail("")}
                    >
                        Use a different email
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                className="flex flex-col gap-5"
                onSubmit={(...args) =>
                    void form.handleSubmit(onSubmit)(...args)
                }
            >
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                            <FormLabel>Email</FormLabel>
                            <InputGroup className="h-12 rounded-lg bg-background">
                                <InputGroupAddon>
                                    <Icons.Mail aria-hidden="true" />
                                </InputGroupAddon>
                                <FormControl>
                                    <InputGroupInput
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@gndmillwork.com"
                                        className="h-full px-0 text-base"
                                        {...field}
                                    />
                                </FormControl>
                            </InputGroup>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Env isDev>
                    <DevPasswordResetAccountSelector
                        onSelectEmail={(email) => {
                            form.setValue("email", email, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                            });
                        }}
                    />
                </Env>

                <Button
                    disabled={isPending}
                    className="h-12 rounded-lg text-sm font-semibold"
                >
                    {isPending && (
                        <Icons.Loader2
                            className="mr-2 size-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    Send reset link
                </Button>
                <Button asChild variant="ghost" className="h-11 rounded-lg">
                    <Link href="/login">
                        <Icons.ArrowLeft className="mr-2 size-4" />
                        Back to login
                    </Link>
                </Button>
            </form>
        </Form>
    );
}
