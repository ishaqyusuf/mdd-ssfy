import { useEffect, useState } from "react";
import { Access, validateRules } from "./sidebar/links";
import type { ReactNode } from "react";
import { useSession } from "@/hooks/use-session";

interface Props {
    children?: ReactNode;
    Fallback?: ReactNode;
    rules?: Access[];
}

export function AuthGuard({ children, Fallback = null, rules }: Props) {
    const session = useSession();
    const [state, setState] = useState<"idle" | "valid" | "invalid">("idle");

    useEffect(() => {
        if (!session) return;
        const isValid = validateRules(
            rules,
            session.can,
            session.userId,
            session.role,
        );
        setState(isValid ? "valid" : "invalid");
    }, [session, rules]);

    if (state === "idle") return null;
    if (state === "invalid") return Fallback;

    return children ?? null;
}
