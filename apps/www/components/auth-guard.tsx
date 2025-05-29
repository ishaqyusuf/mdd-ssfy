"use client";
import { useMemo } from "react";
import { _role, Access, validateRules } from "./sidebar/links";
import type { ReactNode } from "react";
import { useSessionZusStore } from "@/hooks/use-session";

interface Props {
    children?: ReactNode;
    Fallback?: ReactNode;
    rules?: Access[];
}

export function AuthGuard({ children, Fallback = null, rules }: Props) {
    const { session } = useSessionZusStore();
    const isValid = useMemo(
        () =>
            session
                ? validateRules(
                      rules,
                      session?.can,
                      session?.userId,
                      session?.role,
                  )
                : undefined,
        [rules, session],
    );
    if (isValid === undefined) return <span>session not loaded </span>;
    if (!isValid) return Fallback;

    return children ?? null;
}
export function SuperAdminGuard({ children, Fallback = null }: Props) {
    return (
        <AuthGuard rules={[_role.is("Super Admin")]} Fallback={Fallback}>
            {children}
        </AuthGuard>
    );
}
