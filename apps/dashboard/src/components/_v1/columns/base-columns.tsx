"use client";

import { cn } from "@/lib/utils";

import LinkableNode from "../link-node";

export const Cell = ({
    row,
    link,
    children,
    slug,
    className,
    ...mainProps
}: {
    row?;
    link?;
    children?;
    slug?;
    className?;
    onClick?;
}) => {
    // if (!row) return <></>;
    link = link?.replace("slug", slug?.toString());

    return (
        <div {...mainProps} className={cn("w-full", className)}>
            <LinkableNode
                href={link || ""}
                className={cn(link && "hover:underline")}
            >
                {children}
            </LinkableNode>
        </div>
    );
};
