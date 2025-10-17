"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const ModalCatchAllFix = ({
    children,
    paths,
}: {
    children: ReactNode;
    paths;
}) => {
    const pathname = usePathname();
    if (paths?.some((p) => pathname.includes(p))) return <>{children}</>;
    return null;
};
export default ModalCatchAllFix;
