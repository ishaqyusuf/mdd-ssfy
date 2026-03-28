"use client";

import * as React from "react";

import { useTable } from ".";
import { cn } from "../../../utils";
import { TableBody as BaseTableBody } from "../../table";

export const TableBody = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
	const ctx = useTable();
	const mobileMode = ctx?.mobileMode;

	return (
		<BaseTableBody
			ref={ref}
			className={cn(mobileMode?.borderless && "border-0", className)}
			{...props}
		/>
	);
});

TableBody.displayName = "DataTableBody";
