import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { LoginForm } from "./login-form";
import Image from "next/image";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { Env } from "./env";
import QuickLogin from "./quick-login";

export function Login03({ className = "" }) {
    return (
        <div
            className={cn(
                "flex flex-col gap-6 h-screen max-lg:justify-end max-md:pb-28 max-lg:mb-16 overflow-hidden",
                className,
            )}
        >
            <Card className="overflow-hidden  z-10">
                <CardContent className="grid lg:h-screen p-0 lg:grid-cols-2 ">
                    <div className="flex max-lg:items-end z-10 justify-center">
                        <div className="w-4/5 md:w-2/3   max-lg:bg-background">
                            <div className="p-6 md:p-8">
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
                                    <Env isDev>
                                        <QuickLogin />
                                    </Env>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="fixed inset-0 lg:hidden">
                        <Image
                            src="/gnd-backdrop.png"
                            alt="Image"
                            fill
                            className="object-cover h-full w-full dark:brightness-[0.2] dark:grayscale"
                            priority
                        />
                    </div>
                    <div className="relative hidden  bg-muted lg:block">
                        {/* <AspectRatio ratio={0.9}>
                            <Image
                                src="/gnd-backdrop.png"
                                alt="Image"
                                fill
                                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                            />
                        </AspectRatio> */}
                        <Image
                            src="/gnd-backdrop.png"
                            alt="Image"
                            fill
                            className="object-cover h-full w-full dark:brightness-[0.2] dark:grayscale"
                            priority
                        />
                    </div>
                </CardContent>
            </Card>
            {/* <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
                By clicking continue, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
            </div> */}
        </div>
    );
}

