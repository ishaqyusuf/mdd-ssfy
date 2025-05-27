import { useEffect, useMemo, useState } from "react";
import { Access, validateRules } from "./sidebar/links";
import type { ReactNode } from "react";
import { useSession } from "@/hooks/use-session";
import { rndTimeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

interface Props {
    children?: ReactNode;
    Fallback?: ReactNode;
    rules?: Access[];
}

export function AuthGuard({ children, Fallback = null, rules }: Props) {
    const session = useSession();
    // const [__state, setState] = useState<"idle" | "valid" | "invalid">("idle");
    const state = useAsyncMemo(async () => {
        await rndTimeout();
        if (!session) return;
        const isValid = validateRules(
            rules,
            session.can,
            session.userId,
            session.role,
        );
        console.log({ isValid });

        return isValid;
    }, [session, rules]);
    if (state === null) return <span>session not loaded </span>;
    if (!state) return Fallback;

    return children ?? null;
}
