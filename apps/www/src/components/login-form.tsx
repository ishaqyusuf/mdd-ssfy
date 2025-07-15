"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { signIn } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import Link from "@/components/link";
import { Button } from "@gnd/ui/button";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(), //.min(4).max(12)
    withEmail: z.boolean().nullable().default(true),
});
export function LoginForm({}) {
    const form = useZodForm(loginSchema, {
        defaultValues: {
            email: "",
            password: "",
            withEmail: true,
        },
    });
    const withEmail = form.watch("withEmail");

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
                        {withEmail || (
                            <>
                                <FormInput
                                    type="password"
                                    control={form.control}
                                    label="Password"
                                    name="password"
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {/* <Checkbox
                                    id="remember"
                                    checked={formData.rememberMe}
                                    onCheckedChange={(checked) =>
                                        handleInputChange(
                                            "rememberMe",
                                            checked as boolean,
                                        )
                                    }
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm text-slate-600"
                                >
                                    Remember me
                                </Label> */}
                                    </div>
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
                                <Button
                                    type="button"
                                    onClick={(e) => {}}
                                    className="w-full"
                                >
                                    Continue with Email
                                </Button>
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

