import { env } from "@/env.mjs";

export default function DevOnly({ children }) {
    const isProd = env.NEXT_PUBLIC_NODE_ENV === "production";
    if (isProd) return <></>;
    return <>{children}</>;
}
