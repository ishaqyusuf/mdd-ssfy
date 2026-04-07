"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";

import { Icons } from "@/components/_v1/icons";
import { Env } from "@/components/env";
import QuickLogin from "@/components/quick-login";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTransition } from "@/utils/use-safe-transistion";

const loginSchema = z.object({
    email: z.string().email({ message: "Enter a valid work email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginV2() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    const callbackUrl =
        getSafeCallbackUrl(searchParams.get("return_to")) ||
        getSafeCallbackUrl(searchParams.get("callbackUrl")) ||
        "/";
    const token = searchParams.get("token");

    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        if (session?.user?.id) {
            router.replace(callbackUrl);
        }
    }, [callbackUrl, router, session]);

    useEffect(() => {
        if (!token) return;

        signIn("credentials", {
            token,
            callbackUrl,
            redirect: true,
        });
    }, [callbackUrl, token]);

    const onSubmit = form.handleSubmit((values: LoginFormValues) => {
        startTransition(async () => {
            await signIn("credentials", {
                email: values.email,
                password: values.password,
                callbackUrl,
                redirect: true,
            });
        });
    });

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#eef2f7_0%,#f7f9fc_100%)] text-[#0f172a]">
            <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid w-full overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:min-h-[720px] lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="relative hidden min-h-[340px] overflow-hidden lg:block lg:min-h-full">
                        <Image
                            src="/gnd-backdrop.jpeg"
                            alt="GND millwork backdrop"
                            fill
                            priority
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,20,0.18)_0%,rgba(7,12,20,0.42)_45%,rgba(7,12,20,0.72)_100%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%)]" />

                        <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
                            <div className="inline-flex w-fit items-center rounded-2xl bg-white/92 px-4 py-3 shadow-sm backdrop-blur">
                                <Icons.logoLg width={110} />
                            </div>

                            <div className="max-w-lg space-y-4">
                                <p className="text-xs font-medium tracking-[0.2em] text-white/72 uppercase">
                                    GND Workspace
                                </p>
                                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                                    Sign in and get back to work.
                                </h1>
                                <p className="max-w-md text-sm leading-7 text-white/78 sm:text-base">
                                    The backdrop now carries the mood of the page,
                                    while the form stays focused and easy to use.
                                </p>
                                <div className="inline-flex max-w-md items-center rounded-2xl border border-white/18 bg-black/20 px-4 py-3 text-sm leading-6 text-white/80 backdrop-blur-sm">
                                    Email and password sign-in, token login links,
                                    safe redirects, and password reset are all
                                    preserved.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="flex items-center bg-white p-6 sm:p-8 lg:p-10">
                        <div className="mx-auto w-full max-w-md">
                        <div className="mb-6 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
                            <Icons.logoLg width={110} />
                        </div>
                        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
                        <div className="mb-8 space-y-2">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                <LockKeyhole className="size-5" />
                            </div>
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                Welcome back
                            </h2>
                            <p className="text-sm leading-6 text-slate-600">
                                Use your GND credentials to continue.
                            </p>
                        </div>

                        <Form {...form}>
                            <form className="space-y-5" onSubmit={onSubmit}>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-slate-700">
                                                Email
                                            </FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <Mail className="size-4 text-slate-400" />
                                                    <Input
                                                        {...field}
                                                        type="email"
                                                        placeholder="you@gndmillwork.com"
                                                        autoComplete="email"
                                                        className="h-auto border-0 bg-transparent p-0 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-0"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <FormLabel className="text-slate-700">
                                                    Password
                                                </FormLabel>
                                                <Link
                                                    href="/login/password-reset"
                                                    className="text-sm font-medium text-slate-700 transition hover:text-slate-950"
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>
                                            <FormControl>
                                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <LockKeyhole className="size-4 text-slate-400" />
                                                    <Input
                                                        {...field}
                                                        type="password"
                                                        placeholder="Enter your password"
                                                        autoComplete="current-password"
                                                        className="h-auto border-0 bg-transparent p-0 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-0"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Signing in
                                        </>
                                    ) : (
                                        "Sign in"
                                    )}
                                </Button>
                            </form>
                        </Form>

                        <Env isDev>
                            <div className="mt-6 border-t border-slate-200 pt-5">
                                <p className="mb-3 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
                                    Dev Quick Login
                                </p>
                                <QuickLogin />
                            </div>
                        </Env>
                        </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function getSafeCallbackUrl(value: string | null) {
    if (!value?.startsWith("/")) {
        return null;
    }

    return value;
}
