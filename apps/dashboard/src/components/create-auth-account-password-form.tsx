"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { PasswordInput } from "@/components/_v1/password-input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { useTransition } from "@/utils/use-safe-transistion";
import { Button } from "@gnd/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";

type CreateAuthAccountPasswordInputs = z.infer<typeof resetPasswordSchema>;

export function CreateAuthAccountPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
    const hasUsableToken = token.length >= 20;
    const [isPending, startTransition] = useTransition();
    const form = useForm<CreateAuthAccountPasswordInputs>({
        resolver: zodResolver(resetPasswordSchema as any) as any,
        defaultValues: {
            token,
            password: "",
            confirmPassword: "",
        },
    });

    React.useEffect(() => {
        form.setValue("token", token);
    }, [form, token]);

    function onSubmit(data: CreateAuthAccountPasswordInputs) {
        startTransition(async () => {
            const response = await fetch(
                "/api/auth/www-complete-password-migration",
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        token: data.token,
                        password: data.password,
                        callbackURL: callbackUrl,
                    }),
                },
            );
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                toast.error(
                    payload?.message ??
                        "This password setup link is invalid or has expired.",
                );
                return;
            }

            toast.success("Password created successfully.");
            router.push(
                typeof payload?.url === "string" ? payload.url : callbackUrl,
            );
            router.refresh();
        });
    }

    if (!hasUsableToken) {
        return (
            <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Icons.ShieldCheck className="size-4" />
                        Password setup link required
                    </div>
                    <p>
                        This password setup link is missing or expired. Return
                        to login and sign in with your current password again.
                    </p>
                </div>
                <Button asChild className="h-12 w-full rounded-lg">
                    <Link href="/login">Back to login</Link>
                </Button>
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
                <input type="hidden" {...form.register("token")} />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                            <FormLabel>New password</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    placeholder="Enter a new password"
                                    autoComplete="new-password"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    placeholder="Confirm your new password"
                                    autoComplete="new-password"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
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
                    Create password
                </Button>
            </form>
        </Form>
    );
}

function getSafeCallbackUrl(value: string | null) {
    return value?.startsWith("/") ? value : "/";
}
