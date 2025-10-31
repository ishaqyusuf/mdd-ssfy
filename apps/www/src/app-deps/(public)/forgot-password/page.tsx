import { Icons } from "@/components/_v1/icons";
import { PasswordResetForm } from "@/components/password-reset-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@gnd/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Password Reset | GND",
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

            <Card className="shadow-xl sborder-0">
                <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-xl font-semibold text-center">
                        Reset Password
                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your email address and we'll send you a link to
                        reset your password
                    </CardDescription>
                </CardHeader>
                <PasswordResetForm />
            </Card>
        </div>
    );
}

