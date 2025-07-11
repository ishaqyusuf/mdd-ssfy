"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { signIn } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(), //.min(4).max(12)
});
export function LoginForm({}) {
    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
        },
    });
    const [isPending, startTransition] = useTransition();
    const onSubmit = form.handleSubmit(async (data) => {
        console.log(data);
        startTransition(async () => {
            // await signIn("credentials", {
            //     ...data,
            //     callbackUrl: "/",
            //     redirect: true,
            // });
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
                        <FormInput
                            type="password"
                            control={form.control}
                            name="password"
                        />
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-6">
                        <SubmitButton
                            className="w-full"
                            isSubmitting={isPending}
                            disabled={isPending}
                        >
                            Sign in
                        </SubmitButton>
                    </CardFooter>
                </form>
            </Form>
        </>
    );
}

