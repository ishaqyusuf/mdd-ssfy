import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { LoginForm } from "./login-form";
import Image from "next/image";
import { AspectRatio } from "@gnd/ui/aspect-ratio";

export function Login02({ className = "" }) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-5xl">
                <div className={cn("flex flex-col gap-6", className)}>
                    <div className="fixed inset-0">
                        <AspectRatio ratio={1.7}>
                            <Image
                                src="/gnd-backdrop.png"
                                alt="Image"
                                width={740}
                                height={420}
                                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                            />
                        </AspectRatio>
                    </div>
                    <Card className="overflow-hidden z-10">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <div className="p-6 sm:h-[70vh] md:p-8">
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">
                                            Welcome back
                                        </h1>
                                        <p className="text-balance text-muted-foreground">
                                            Login to your GND account
                                        </p>
                                    </div>
                                    <LoginForm />
                                </div>
                            </div>
                            <div className="relative hidden bg-muted md:block">
                                <AspectRatio ratio={0.9}>
                                    <Image
                                        src="/gnd-backdrop.png"
                                        alt="Image"
                                        fill
                                        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                                    />
                                </AspectRatio>
                            </div>
                        </CardContent>
                    </Card>
                    {/* <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
                By clicking continue, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
            </div> */}
                </div>
            </div>
        </div>
    );
}

