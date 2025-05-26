import { useSession } from "@/hooks/use-session";
import { useState } from "react";

export function AuthGuard({ children, Fallback }) {
    const session = useSession();
    const [state, setState] = useState<"idle" | "valid" | "invalid">("idle");

    if (state == "invalid") {
    }
    return <div></div>;
}
