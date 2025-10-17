"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { resetPasswordRequest } from "@/app/(v1)/_actions/auth";
import { Icons } from "@/components/_v1/icons";
import { _useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import { checkEmailSchema, ILogin, loginSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
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
import { Input } from "@gnd/ui/input";
import { useTransition } from "@/utils/use-safe-transistion";

export type ResetPasswordRequestInputs = z.infer<typeof checkEmailSchema>;
export function ResetPasswordForm() {
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>("");

    const form = useForm<ResetPasswordRequestInputs>({
        resolver: zodResolver(checkEmailSchema),
    });

    const [isPending, startTransition] = useTransition();

    const router = useRouter();
    async function onSubmit(data: ResetPasswordRequestInputs) {
        startTransition(async () => {
            const resp = await resetPasswordRequest(data);
            if (!resp) toast.error("User with email not found");
            else {
                router.push("/login/password-reset/next");
                toast.error("Check your email", {
                    description: "We sent you a 6-digit verification code.",
                });
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
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="rodneymullen180@gmail.com"
                                    {...field}
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
                    Continue
                    <span className="sr-only">
                        Continue to reset password verification
                    </span>
                </Button>
            </form>
        </Form>
    );
}
