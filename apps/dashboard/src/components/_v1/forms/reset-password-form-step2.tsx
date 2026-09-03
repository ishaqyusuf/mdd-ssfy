"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@gnd/ui/icons";
import { PasswordInput } from "@/components/_v1/password-input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@gnd/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { useTransition } from "@/utils/use-safe-transistion";

export type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordStep2Form() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const token = searchParams.get("token") ?? "";
    const hasUsableToken = token.length >= 20;

    // react-hook-form
    const form = useForm<ResetPasswordFormInputs>({
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

    function onSubmit(data: ResetPasswordFormInputs) {
        startTransition(async () => {
            try {
                const response = await fetch("/api/auth/www-reset-password", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        token: data.token,
                        password: data.password,
                    }),
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        payload?.message ??
                            "This password reset link is invalid or has expired.",
                    );
                }

                toast.success("Password reset successfully.");
                router.push("/login");
            } catch (err: any) {
                toast.error(err.message);
            }
        });
    }

    if (!hasUsableToken) {
        return (
            <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Icons.ShieldCheck className="size-4" />
                        Reset link required
                    </div>
                    <p>
                        This password reset link is missing or expired. Request
                        a new link and use the latest email we send.
                    </p>
                </div>
                <Button asChild className="h-12 w-full rounded-lg">
                    <Link href="/password-reset">Request a new link</Link>
                </Button>
                <Button
                    asChild
                    variant="ghost"
                    className="h-11 w-full rounded-lg"
                >
                    <Link href="/login">
                        <Icons.ArrowLeft className="mr-2 size-4" />
                        Back to login
                    </Link>
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
                    Reset password
                </Button>
                <Button asChild variant="ghost" className="h-11 rounded-lg">
                    <Link href="/password-reset">Request a new link</Link>
                </Button>
            </form>
        </Form>
    );
}
