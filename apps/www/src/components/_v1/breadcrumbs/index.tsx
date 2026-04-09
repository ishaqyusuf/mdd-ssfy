"use client";

import { Icons } from "@gnd/ui/icons";
import * as React from "react";
import { createPortal } from "react-dom";

interface BreadcrumbsProps {
    //   segments: INav[];
    separator?: React.ComponentType<{ className?: string }>;
    children?;
}

export function Breadcrumbs({ children, separator }: BreadcrumbsProps) {
    const SeparatorIcon = separator ?? Icons.ChevronRightIcon;
    const BreadCrumbElement = document?.getElementById("breadCrumb");
    if (!BreadCrumbElement) return;
    return createPortal(
        <nav
            aria-label="breadcrumbs"
            className="  items-center text-sm font-medium text-muted-foreground hidden md:flex"
        >
            {children}
        </nav>,
        BreadCrumbElement,
    ) as any;
}
