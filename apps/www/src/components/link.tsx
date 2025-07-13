"use client";

import BaseLink from "next/link";
import { ComponentPropsWithoutRef, useState } from "react";

//extends  BaseLink props
interface Props extends ComponentPropsWithoutRef<typeof BaseLink> {}
export default function Link({ children, ...props }: Props) {
    const [active, setActive] = useState(false);
    // props.target

    return (
        <BaseLink
            // href={href}
            {...props}
            prefetch={active ? null : false}
            onMouseEnter={() => setActive(true)}
        >
            {children}
        </BaseLink>
    );
}

