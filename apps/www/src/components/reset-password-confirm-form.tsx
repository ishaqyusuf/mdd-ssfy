"use client";
import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { useTransition } from "@/utils/use-safe-transistion";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { toast } from "sonner";

const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export function ResetPasswordConfirmForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") ?? "";

    const form = useZodForm(resetPasswordSchema, {
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });
    const [isPending, startTransition] = useTransition();
    const onSubmit = form.handleSubmit(async (data) => {
        startTransition(async () => {
            const { error } = await authClient.resetPassword({
                newPassword: data.password,
                token,
            });
            if (error) {
                toast.error(error.message ?? "Failed to reset password");
            } else {
                toast.success("Password reset successfully");
                router.push("/login");
            }
        });
    });
    return (
        <>
            <Form {...form}>
                <form className="" onSubmit={onSubmit}>
                    <CardContent className="space-y-4">
                        <FormInput
                            type="password"
                            label="New Password"
                            control={form.control}
                            name="password"
                        />
                        <FormInput
                            type="password"
                            label="Confirm New Password"
                            control={form.control}
                            name="confirmPassword"
                        />
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-6">
                        <SubmitButton
                            className="w-full"
                            isSubmitting={isPending}
                            disabled={isPending || !token}
                        >
                            Reset Password
                        </SubmitButton>
                    </CardFooter>
                </form>
            </Form>
        </>
    );
}
