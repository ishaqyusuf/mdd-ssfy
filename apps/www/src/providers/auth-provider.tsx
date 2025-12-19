// app/providers/auth-provider.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { useAuth } from "@/hooks/use-auth";

const publicRoutes = [
    "/api/pdf",
    "/checkout",
    "/login",
    "/signin",
    "/printer/sales",
    "/signout",
    "/square-payment",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const auth = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { isPending, role, id: authId, can } = auth;
    useEffect(() => {
        const isPublic = publicRoutes.some((p) => pathname.includes(p));
        if (isPending || isPublic) {
            return;
        }
        if (!auth?.id) {
            router.replace(`/login?return_to=${pathname}`);
            return;
        }
        if (!isPublic && auth?.id) {
            const links = validateLinks({
                role,
                can,
                userId: authId,
            });
            const validLinks = getLinkModules(links);
            const v = validatePath(pathname, validLinks.linksNameMap);

            if (!v?.hasAccess && v?.name) router.replace("/");
        }
    }, [pathname, isPending, can, role, authId]);

    // if (isPending) return null; // optional spinner
    return <>{children}</>;
}

// helper reused
const validatePath = <T extends Record<string, any>>(
    path: string,
    links: T
): T[keyof T] & { href: string } => {
    const segments = path.split("/");
    const k = Object.keys(links).find((key) => {
        const keySegs = key.split("/");
        if (keySegs.length !== segments.length) return false;
        return keySegs.every(
            (seg, i) => seg.startsWith("slug") || seg === segments[i]
        );
    }) as keyof T | undefined;

    return { href: k as any, ...(links[k] || {}) } as any;
};

