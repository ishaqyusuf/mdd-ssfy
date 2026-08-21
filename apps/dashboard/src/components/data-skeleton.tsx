"use client";

import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "@/lib/utils";
import { Placeholders } from "@/utils/constants";
import React from "react";

interface Props {
	children?: React.ReactNode;
	className?: string;
	placeholder?: React.ReactNode;
	pok?: keyof typeof Placeholders;
	as?: React.ElementType | typeof React.Fragment;
}
export function DataSkeleton({
	children = null,
	className = "",
	placeholder = "",
	as = "span",
	pok,
}: Props) {
	const ctx = useDataSkeleton();
	if (!placeholder && pok) placeholder = Placeholders[pok];
	if (ctx?.loading) {
		return as === React.Fragment ? (
			<React.Fragment>
				<span className="animate-pulse rounded-md bg-muted opacity-0">
					{placeholder}
				</span>
			</React.Fragment>
		) : (
			React.createElement(
				as,
				{
					className: cn("animate-pulse rounded-md bg-muted", className),
				},
				<span className="opacity-0">{placeholder}</span>,
			)
		);
	}

	return as === React.Fragment
		? children
		: React.createElement(
				as,
				{ className: !ctx?.loading ? "" : cn(className) },
				children,
			);
	// if (ctx.loading)
	//     return (

	//         <span
	//             className={cn(
	//                 "animate-pulse rounded-md bg-muted",
	//                 className,
	//                 !placeholder && ""
	//             )}
	//         >
	//             <div className="opacity-0">{placeholder}</div>
	//         </span>
	//     );

	// return <span className={cn(className)}>{children}</span>;
}
