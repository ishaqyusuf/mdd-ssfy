"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/app/(v1)/_actions/auth";
import { Icons } from "@/components/_v1/icons";
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
import { Input } from "@gnd/ui/input";

export type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordStep2Form() {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();

    // react-hook-form
    const form = useForm<ResetPasswordFormInputs>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
            code: "",
        },
    });

    function onSubmit(data: ResetPasswordFormInputs) {
        startTransition(async () => {
            try {
                const resp = await resetPassword(data);
                toast.success("Password reset successfully.");
                router.push("/login");
                // const attemptFirstFactor = await signIn.attemptFirstFactor({
                //   strategy: "reset_password_email_code",
                //   code: data.code,
                //   password: data.password,
                // })

                // if (attemptFirstFactor.status === "needs_second_factor") {
                //   // TODO: implement 2FA (requires clerk pro plan)
                // } else if (attemptFirstFactor.status === "complete") {
                //   await setActive({
                //     session: attemptFirstFactor.createdSessionId,
                //   })
                //   router.push(`${window.location.origin}/`)
                //   toast.success("Password reset successfully.")
                // } else {
                //   console.error(attemptFirstFactor)
                // }
            } catch (err: any) {
                toast.error(err.message);
            }
        });
    }

    return (
        <Form {...form}>
            <form
                className="grid gap-4"
                onSubmit={(...args) =>
                    void form.handleSubmit(onSubmit)(...args)
                }
            >
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    placeholder="*********"
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
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    placeholder="*********"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="169420"
                                    {...field}
                                    onChange={(e) => {
                                        e.target.value = e.target.value.trim();
                                        field.onChange(e);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button disabled={isPending}>
                    {isPending && (
                        <Icons.spinner
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    Reset password
                    <span className="sr-only">Reset password</span>
                </Button>
            </form>
        </Form>
    );
}
