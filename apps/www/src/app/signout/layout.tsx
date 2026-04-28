"use client";

import { ClientAuthGuard } from "@/components/auth/client-auth-guard";

export default function AccountLayout({ children }: any) {
	return <ClientAuthGuard>{children}</ClientAuthGuard>;
}
