"use client";

import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { type Access, _role, validateRules } from "./sidebar/links";

interface Props {
	children?: ReactNode;
	Fallback?: ReactNode;
	rules?: Access[];
}

export function AuthGuard({ children, Fallback = null, rules }: Props) {
	const auth = useAuth();
	const isValid = useMemo(
		() =>
			auth.enabled && !auth.isPending
				? validateRules(rules, auth.can, auth.id, auth.role)
				: undefined,
		[auth.can, auth.enabled, auth.id, auth.isPending, auth.role, rules],
	);
	if (isValid === undefined) return <span> </span>;
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
