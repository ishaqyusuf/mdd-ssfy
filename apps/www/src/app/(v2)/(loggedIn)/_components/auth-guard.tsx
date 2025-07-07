"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { ICan } from "@/types/auth";
import { useSession } from "next-auth/react";

export type AuthPermissions = (keyof ICan | (keyof ICan)[])[];
interface Props {
    can?: AuthPermissions;
    // somePermissions?: AuthPermissions;
    roles?: string[];
    permissionType?: "every" | "some" | "none";
    children?;
    className?;
    noRedirect?: boolean;
}
export default function AuthGuard({
    can = [],
    className,
    children,
    permissionType = "every",
    roles = [],
    noRedirect,
}: Props) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });

    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const gn = (v) =>
            Array.isArray(v)
                ? v.some((p) => session?.can?.[p])
                : session?.can?.[v];
        const fn = permissionType == "every" ? can?.every(gn) : can?.some(gn);

        let res = !can?.length ? true : fn;
        if (permissionType == "none") res = !res;
        const permission = !can.length || res;
        const rolePermission =
            !roles.length || roles?.some((r) => r == session?.role?.name);

        const _visible =
            (permission && rolePermission) || session?.role.name == "Admin";
        setVisible(_visible);
        if (!_visible && !noRedirect) {
            redirect("/");
        }
    }, [noRedirect, can, roles, permissionType]);

    return <div className={cn(className)}>{visible && children}</div>;
}
