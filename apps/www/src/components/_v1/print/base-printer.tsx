"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
    children?;
    id?;
    preview?: Boolean;
}
export default function BasePrinter({ children, preview, id }: Props) {
    const [TabElement, setTabElement] = useState(document?.body);
    return (
        <>
            {TabElement &&
                createPortal(
                    <div
                        id={id}
                        className={cn(!preview && "hidden print:block")}
                    >
                        {children}
                    </div>,
                    TabElement
                )}
        </>
    );
}

