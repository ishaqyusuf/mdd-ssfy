"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { signIn } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { SendLoginEmailPayload } from "@jobs/schema";
import { Icons } from "@/components/_v1/icons";
import { useEffect } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { InputField } from "@gnd/ui/controls-2/input-field";

import { Key } from "lucide-react";
import { betterAuthAccounts } from "@/actions/better-auth-accounts";

import { authClient } from "@/auth/client";
const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().optional(),
    withEmail: z.boolean().default(true),
});

type LoginForm = z.infer<typeof loginSchema>;

function useLoginEmail() {
    const [params, setParams] = useQueryStates({
        token: parseAsString,
    });
    return {
        params,
        setParams,
    };
}

export function SigninComponent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [isPending, startTransition] = useTransition();

    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
            withEmail: true,
        },
    });
    const withEmail = form.watch("withEmail");

    const l = useLoginEmail();
    const token = l?.params?.token;

    useEffect(() => {
        if (!token) return;
        signIn("credentials", {
            token,
            callbackUrl: "/",
            redirect: true,
        });
    }, [token, callbackUrl]);

    const loginWithEmail = useTaskTrigger({
        debug: true,
    });

    const onSubmit = form.handleSubmit(async (data: LoginForm) => {
        await betterAuthAccounts();
        authClient.signIn
            .email({
                email: data.email,
                password: data.password,
            })
            .then((resp) => {
                console.log({ resp });
            });
        return;
        if (data.withEmail) {
            loginWithEmail.trigger({
                taskName: "send-login-email",
                payload: {
                    email: data.email,
                } as SendLoginEmailPayload,
            });
        } else {
            startTransition(async () => {
                await signIn("credentials", {
                    email: data.email,
                    password: data.password,
                    callbackUrl,
                    redirect: true,
                });
            });
        }
    });

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <Image
                    src="/gnd-backdrop.png"
                    alt="Image"
                    fill
                    className="absolute inset-0 h-full w-full object-cover opacity-20"
                />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Icons.logo />
                </div>
            </div>
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-[400px] grid gap-6">
                    <div className="grid gap-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your email to get started.
                        </p>
                    </div>
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="grid gap-4">
                            <InputField
                                name="email"
                                type="email"
                                label="Email"
                                prefix={<Icons.Email className="size-4" />}
                                control={form.control}
                                placeholder="m@example.com"
                            />
                            {withEmail || (
                                <>
                                    <InputField
                                        name="password"
                                        type="password"
                                        label="Password"
                                        placeholder="Password"
                                        prefix={<Key className="size-4" />}
                                        control={form.control}
                                    />
                                    <div className="text-sm">
                                        <Link
                                            href="/login/password-reset"
                                            className="font-medium text-primary hover:text-primary/80"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                </>
                            )}

                            {!withEmail ? (
                                <SubmitButton
                                    className="w-full"
                                    isSubmitting={isPending}
                                >
                                    Sign In
                                </SubmitButton>
                            ) : (
                                <>
                                    <SubmitButton
                                        isSubmitting={loginWithEmail?.isLoading}
                                        className="w-full"
                                    >
                                        Continue with Email
                                    </SubmitButton>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            form.setValue("withEmail", false)
                                        }
                                        variant="secondary"
                                        className="w-full"
                                    >
                                        Enter Password
                                    </Button>
                                </>
                            )}
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}

