"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function AccountLayout({ children }: any) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login/v2");
        },
    });

    if (!session?.user) return <></>;
    // if (session.role?.name == "Dealer") redirect("/orders");

    return <>{children}</>;
}
