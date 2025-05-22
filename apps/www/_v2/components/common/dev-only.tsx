export default function DevOnly({ children }) {
    const isProd = process.env.NEXT_PUBLIC_NODE_ENV === "production";
    if (isProd) return <></>;
    return <>{children}</>;
}
