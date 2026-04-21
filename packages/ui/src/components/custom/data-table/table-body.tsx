"use client";

import * as React from "react";

import { useTable } from ".";
import { cn } from "../../../utils";

export const TableBody = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
	const ctx = useTable();
	const mobileMode = ctx?.mobileMode;
	const resolvedClassName = mobileMode?.borderless
		? cn("[&_tr:last-child]:border-0", className)
		: cn("border [&_tr:last-child]:border-0", className);

	return (
		<tbody
			ref={ref}
			className={resolvedClassName}
			{...props}
		/>
	);
});

TableBody.displayName = "DataTableBody";
