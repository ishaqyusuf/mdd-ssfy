import { Icons } from "@/components/_v1/icons";
import { ResetPasswordConfirmForm } from "@/components/reset-password-confirm-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@gnd/ui/card";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Reset Password | GND",
};
export default async function Page() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <header className="absolute top-0 left-0 z-30 w-full">
                <div className="p-6 md:p-8">
                    <div className="h-8 w-auto">
                        <Icons.logoLg />
                    </div>
                </div>
            </header>

            <Card className="shadow-xl border-0">
                <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-xl font-semibold text-center">
                        Set New Password
                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your new password below to complete the reset
                    </CardDescription>
                </CardHeader>
                <Suspense>
                    <ResetPasswordConfirmForm />
                </Suspense>
            </Card>
        </div>
    );
}
