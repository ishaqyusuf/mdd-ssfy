import { SigninComponent } from "@/components/signin";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | GND",
};

export default async function SigninPage() {
    return <SigninComponent />;
}

