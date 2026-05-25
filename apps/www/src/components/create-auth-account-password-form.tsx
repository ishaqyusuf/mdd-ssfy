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
            <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Icons.ShieldCheck className="size-4 text-amber-700" />
                        Password setup link required
                    </div>
                    <p>
                        This password setup link is missing or expired. Return
                        to login and sign in with your current password again.
                    </p>
                </div>
                <Button
                    asChild
                    className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                    <Link href="/login/v2">Back to login</Link>
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                className="grid gap-5"
                onSubmit={(...args) =>
                    void form.handleSubmit(onSubmit)(...args)
                }
            >
                <input type="hidden" {...form.register("token")} />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-slate-700">
                                New password
                            </FormLabel>
                            <FormControl>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <PasswordInput
                                        placeholder="Enter a new password"
                                        autoComplete="new-password"
                                        className="h-auto border-0 bg-transparent p-0 pr-10 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-0"
                                        {...field}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-slate-700">
                                Confirm password
                            </FormLabel>
                            <FormControl>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <PasswordInput
                                        placeholder="Confirm your new password"
                                        autoComplete="new-password"
                                        className="h-auto border-0 bg-transparent p-0 pr-10 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-0"
                                        {...field}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    disabled={isPending}
                    className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
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
