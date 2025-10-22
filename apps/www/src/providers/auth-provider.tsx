// app/providers/auth-provider.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { useAuth } from "@/hooks/use-auth";
import { consoleLog } from "@gnd/utils";

const publicRoutes = [
    "/login",
    "/square-payment",
    "/checkout",
    "/signout",
    "/api/pdf",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const auth = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (auth?.isPending) return;

        const isPublic = publicRoutes.some((p) => pathname.includes(p));
        consoleLog("AUTH", { isPublic, auth, pathname });
        if (!isPublic && !auth?.id) {
            consoleLog("AUTH->>>", { isPublic, auth });
            router.replace(`/login?return_to=${pathname}`);
            return;
        }

        // if (auth?.id && pathname === "/") {
        //     const links = getLinkModules(
        //         validateLinks({
        //             role: auth.role,
        //             can: auth.can,
        //             userId: auth.id,
        //         })
        //     );
        //     router.replace(links.defaultLink);
        //     return;
        // }

        //    if (!isPublic && auth?.id) {
        //        const validLinks = getLinkModules(
        //            validateLinks({
        //                role: auth.role,
        //                can: auth.can,
        //                userId: auth.id,
        //            })
        //        );
        //        const v = validatePath(pathname, validLinks.linksNameMap);
        //        if (!v?.hasAccess) router.replace("/");
        //    }
    }, [pathname, auth]);

    // if (auth.isPending) return null; // optional spinner
    return <>{children}</>;
}
export function SAuthProvider({ children }: { children: React.ReactNode }) {
    // const [auth, setAuth] = useState<AuthState>(null);
    const auth = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (auth?.isPending) return;

        const isPublic = publicRoutes.some((p) => pathname.includes(p));
        if (!isPublic && !auth?.id) {
            router.replace(`/login?return_to=${pathname}`);
            return;
        }

        if (auth?.id && pathname === "/") {
            const links = getLinkModules(
                validateLinks({
                    role: auth.role,
                    can: auth.can,
                    userId: auth.id,
                })
            );
            router.replace(links.defaultLink);
            return;
        }

        if (!isPublic && auth?.id) {
            const validLinks = getLinkModules(
                validateLinks({
                    role: auth.role,
                    can: auth.can,
                    userId: auth.id,
                })
            );
            const v = validatePath(pathname, validLinks.linksNameMap);
            if (!v?.hasAccess) router.replace("/");
        }
    }, [pathname, auth]);

    if (auth.isPending) return null; // optional spinner
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

