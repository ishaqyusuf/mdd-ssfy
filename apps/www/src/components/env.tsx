import { env } from "@/env.mjs";

interface Props {
    children?;
    Fallback?;
    isDev?: boolean;
    isProd?: boolean;
}
export function Env(props: Props) {
    const envIsProd = env.NEXT_PUBLIC_NODE_ENV === "production";
    const show = (envIsProd && props.isProd) || (!envIsProd && props.isDev);
    if (!show) return props?.Fallback;
    return props.children;
}

