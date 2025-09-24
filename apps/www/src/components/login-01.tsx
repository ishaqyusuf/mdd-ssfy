import { Env } from "@/components/env";
import { Icons } from "@/components/_v1/icons";
import { LoginForm } from "@/components/login-form";
import QuickLogin from "@/components/quick-login";
import { Card, CardDescription, CardHeader, CardTitle } from "@gnd/ui/card";
export function Login01() {
    return (
        <div className="min-h-screen     flex items-center justify-center p-4">
            <header className="absolute top-0 left-0 z-30 w-full">
                <div className="p-6 md:p-8">
                    <div className="h-8 w-auto">
                        <Icons.logoLg />
                    </div>
                </div>
            </header>
            <Card className="shadow-xl w-full max-w-md sborder-0">
                <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-xl font-semibold text-center">
                        Sign In
                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <Env isDev>
                    <QuickLogin />
                </Env>
                <LoginForm />
            </Card>
        </div>
    );
}
