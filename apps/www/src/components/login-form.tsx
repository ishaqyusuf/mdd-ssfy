"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";

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
    const onSubmit = form.handleSubmit((data) => {});
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
                </form>
            </Form>
        </>
    );
}

