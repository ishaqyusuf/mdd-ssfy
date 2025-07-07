import { type Metadata } from "next";
import Link from "next/link";
import { ResetPasswordStep2Form } from "@/components/_v1/forms/reset-password-form-step2";
import { Shell } from "@/components/_v1/shells/shell";
import { env } from "@/env.mjs";
import { ArrowLeft } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";

export const metadata: Metadata = {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: "Reset Password",
    description: "Enter your email to reset your password",
};

export default function ResetPasswordStep2Page() {
    return (
        <Shell className="max-w-lg">
            <Card>
                <CardHeader className="space-y-1">
                    <div className="">
                        <Link
                            aria-label="Reset password"
                            href="/signin"
                            className="inline-flex items-center text-sm text-primary underline-offset-4 transition-colors hover:underline"
                        >
                            <ArrowLeft className="mr-2 inline-flex w-4" /> Sign
                            In
                        </Link>
                    </div>
                    <CardTitle className="text-2xl">Reset password</CardTitle>
                    <CardDescription>
                        Enter your email address and we will send you a
                        verification code
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResetPasswordStep2Form />
                </CardContent>
            </Card>
        </Shell>
    );
}
