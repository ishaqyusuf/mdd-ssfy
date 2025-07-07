"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import SiteNavLayout from "./site-nav-layout";

interface Props {
    children: any;
}
export function LoggedInLayout({ children }: Props) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    if (!session?.user) return <></>;
    return <SiteNavLayout>{children}</SiteNavLayout>;
}
