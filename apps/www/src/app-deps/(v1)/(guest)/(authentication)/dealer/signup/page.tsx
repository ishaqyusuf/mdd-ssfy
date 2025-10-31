import { Metadata } from "next";
import Link from "@/components/link";
import { Shell } from "@/components/_v1/shells/shell";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";

import SignupForm from "./signup-form";

export const metadata: Metadata = {
    title: "Sign Up - GND Prodesk",
    description: "",
};

export default async function SignupPage() {
    return (
        <Shell className="sm:max-w-2xl">
            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Become a dealer</CardTitle>
                    <CardDescription>
                        As a premier wholesale distributor, GND Millwork
                        utilizes state-of-the-art warehouses, advanced
                        production facilities, and an efficient logistics
                        network to deliver top-quality products and unmatched
                        expertise to our dealer partners. If {"you're"}
                        interested in becoming a dealer partner with us, please
                        reach out for more information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <SignupForm />
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-2 space-x-4">
                    <Link
                        aria-label="Reset password"
                        href="/dealer/signup"
                        className="text-sm text-primary underline-offset-4 transition-colors hover:underline"
                    >
                        Back to signin
                    </Link>
                    <div className="text-sm text-muted-foreground"></div>
                </CardFooter>
            </Card>
        </Shell>
    );
}
