"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";
import { nav } from "@/lib/navs";
import { useSession } from "next-auth/react";

export default function AuthPage({}) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    // console.log(session)
    useEffect(() => {
        let sb = nav(session);

        if (sb) {
            console.log(sb.homeRoute);
            redirect(sb.homeRoute);
        }
        // else signOut();
    }, [session]);
    return <></>;
}
