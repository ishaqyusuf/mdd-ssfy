"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app-deps/(v1)/_actions/auth";
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
                await resetPassword(data);
                toast.success("Password reset successfully.");
                router.push("/login");
            } catch (err: any) {
                toast.error(err.message);
            }
        });
    }

    if (!hasUsableToken) {
        return (
            <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Icons.ShieldCheck className="size-4 text-amber-700" />
                        Reset link required
                    </div>
                    <p>
                        This password reset link is missing or expired. Request a new
                        link and use the latest email we send.
                    </p>
                </div>
                <Button asChild className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                    <Link href="/password-reset">Request a new link</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 w-full rounded-2xl">
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
                            <FormLabel className="text-slate-700">New password</FormLabel>
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
                            <FormLabel className="text-slate-700">Confirm password</FormLabel>
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
                    Reset password
                </Button>
                <Button asChild variant="ghost" className="h-11 rounded-2xl">
                    <Link href="/password-reset">Request a new link</Link>
                </Button>
            </form>
        </Form>
    );
}
