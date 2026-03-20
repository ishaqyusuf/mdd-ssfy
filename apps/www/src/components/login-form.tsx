"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { useTransition } from "@/utils/use-safe-transistion";

import Link from "@/components/link";
import { Button } from "@gnd/ui/button";

import { parseAsString, useQueryStates } from "nuqs";

import { useEffect, useState } from "react";
import { authClient } from "@/auth/client";
import { toast } from "sonner";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    withEmail: z.boolean().nullable().default(true),
});
function useLoginEmail() {
    const [params, setParams] = useQueryStates({
        token: parseAsString,
    });
    return {
        params,
        setParams,
    };
}
export function LoginForm() {
    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
            withEmail: true,
        },
    });
    const withEmail = form.watch("withEmail");
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [isPending, startTransition] = useTransition();
    const onSubmit = form.handleSubmit(async (data) => {
        if (data.withEmail) {
            startTransition(async () => {
                const { error } = await authClient.signIn.magicLink({
                    email: data.email,
                    callbackURL: "/",
                });
                if (error) {
                    toast.error(error.message ?? "Failed to send login email");
                } else {
                    setMagicLinkSent(true);
                    toast.success("Check your email", {
                        description:
                            "We sent you a secure login link. Check your inbox.",
                    });
                }
            });
        } else {
            startTransition(async () => {
                const { error } = await authClient.signIn.email({
                    email: data.email,
                    password: data.password,
                    callbackURL: "/",
                });
                if (error) {
                    toast.error(error.message ?? "Invalid credentials");
                }
            });
        }
    });
    return (
        <>
            <Form {...form}>
                <form className="" onSubmit={onSubmit}>
                    <CardContent className="space-y-4">
                        <FormInput
                            label="Email"
                            control={form.control}
                            name="email"
                        />
                        {withEmail || (
                            <>
                                <FormInput
                                    type="password"
                                    control={form.control}
                                    label="Password"
                                    name="password"
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2"></div>
                                    <Link
                                        href="/login/password-reset"
                                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-6">
                        {!withEmail ? (
                            <>
                                <SubmitButton
                                    className="w-full"
                                    isSubmitting={isPending}
                                    disabled={isPending}
                                >
                                    Sign in
                                </SubmitButton>
                            </>
                        ) : (
                            <>
                                <SubmitButton
                                    isSubmitting={isPending}
                                    className="w-full"
                                    disabled={magicLinkSent}
                                >
                                    {magicLinkSent
                                        ? "Email sent — check your inbox"
                                        : "Continue with Email"}
                                </SubmitButton>
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        form.setValue("withEmail", false);
                                    }}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    Enter Password
                                </Button>
                            </>
                        )}
                    </CardFooter>
                </form>
            </Form>
        </>
    );
}
