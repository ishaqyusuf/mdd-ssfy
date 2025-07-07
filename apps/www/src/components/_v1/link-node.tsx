"use client";

import { cn } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import Link from "next/link";

export default function LinkableNode({
    href,
    As,
    children,
    _blank,
    ...props
}: PrimitiveDivProps & { href?; className?; As?; _blank?: Boolean }) {
    if (href)
        return (
            <Link
                {...(props as any)}
                className={cn("hover:underline", props?.className)}
                target={_blank && "_blank"}
                href={href}
            >
                {children}
            </Link>
        );
    return <div {...props}>{children}</div>;
}
