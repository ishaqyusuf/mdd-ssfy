"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { signIn } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";

import Link from "@/components/link";
import { Button } from "@gnd/ui/button";
import { ArrowLeft } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(), //.min(4).max(12)
});
export function PasswordResetForm({}) {
    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
        },
    });
    const [isPending, startTransition] = useTransition();
    const onSubmit = form.handleSubmit(async (data) => {
        startTransition(async () => {
            await signIn("credentials", {
                ...data,
                callbackUrl: "/",
                redirect: true,
            });
        });
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
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-6">
                        <SubmitButton
                            className="w-full"
                            isSubmitting={isPending}
                            disabled={isPending}
                        >
                            Send Reset Instruction
                        </SubmitButton>
                        <Button variant="ghost" asChild className="w-full h-11">
                            <Link
                                href="/login"
                                className="flex items-center justify-center space-x-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Sign In</span>
                            </Link>
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </>
    );
}

