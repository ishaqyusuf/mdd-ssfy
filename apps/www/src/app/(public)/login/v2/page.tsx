import type { Metadata } from "next";

import { LoginV2 } from "@/components/login-v2";

export const metadata: Metadata = {
    title: "Login V2 | GND",
};

export default function LoginV2Page() {
    return <LoginV2 />;
}
