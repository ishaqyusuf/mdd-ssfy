"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { signIn, useSession } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";

import Link from "@/components/link";
import { Button } from "@gnd/ui/button";

import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { SendLoginEmailPayload } from "@jobs/schema";
import { parseAsString, useQueryStates } from "nuqs";

import { useEffect } from "react";
import { redirect } from "next/navigation";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(), //.min(4).max(12)
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
export function LoginForm({}) {
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

    const { data: session } = useSession({});
    useEffect(() => {
        if (session?.user?.id) redirect("/");
    }, [session]);
    useEffect(() => {
        console.log({ token });
        if (!token) return;
        signIn("credentials", {
            token,
            callbackUrl: "/",
            redirect: true,
        });
    }, [token]);
    // const trpc = useTRPC();
    // const { data } = useQuery({
    //     ...trpc.user.getLoginByToken.queryOptions(
    //         {
    //             token: l?.params?.token,
    //         },
    //         {
    //             enabled: !!l?.params?.token,
    //         },
    //     ),
    // });
    // useEffect(() => {
    //     const email = data?.email;
    //     const token = l?.params?.token;
    //     if(email && token)
    //     {

    //     }
    // }, [l?.params?.token, data?.email]);
    const [isPending, startTransition] = useTransition();
    const onSubmit = form.handleSubmit(async (data) => {
        if (data.withEmail)
            loginWithEmail.trigger({
                taskName: "send-login-email",
                payload: {
                    email: data.email,
                } as SendLoginEmailPayload,
            });
        else
            startTransition(async () => {
                await signIn("credentials", {
                    ...data,
                    callbackUrl: "/",
                    redirect: true,
                });
            });
    });
    const loginWithEmail = useTaskTrigger({
        debug: true,
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
                                        href="/forgot-password"
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
                                    isSubmitting={loginWithEmail?.isLoading}
                                    className="w-full"
                                >
                                    Continue with Email
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

