"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

import { AnimatedNumber } from "./animated-number";
import { ResponsiveMetric } from "./responsive-metric";

export function SummaryCardSkeleton() {
	return (
		<Card className="min-w-0 rounded-none border-0 border-border/70 border-t bg-transparent shadow-none first:border-t-0 odd:border-r sm:rounded-lg sm:border sm:bg-card sm:shadow-sm sm:first:border-t sm:odd:border-r-0">
			<div className="px-3 py-2.5 sm:hidden">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="mt-2 h-6 w-24" />
			</div>
			<div className="hidden sm:block">
				<CardHeader className="pb-2">
					<CardTitle>
						<Skeleton className="h-8 w-32" />
					</CardTitle>
				</CardHeader>

				<CardContent>
					<div className="flex flex-col gap-2">
						<Skeleton className="h-5 w-16" />
						<Skeleton className="h-4 w-24" />
					</div>
				</CardContent>
			</div>
		</Card>
	);
}

interface Props {
	title?: string;
	currency?;
	total_amount?;
	subtitle?;
	masked?: boolean;
}
export function SummaryCard(props: Props) {
	const [isHovered, setIsHovered] = useState(false);
	function getDisplayValue() {
		if (props.currency === "number") {
			return String(props.total_amount ?? 0);
		}
		return formatCurrency.format(props.total_amount || 0);
	}

	const maskedValue = getDisplayValue().replace(/\d/g, "*");

	const value = (
		<button
			type="button"
			onMouseEnter={() => props.masked && setIsHovered(true)}
			onMouseLeave={() => props.masked && setIsHovered(false)}
			className={cn(
				"max-w-full truncate text-left",
				props.masked && "cursor-default",
				props.masked && !isHovered && "tracking-wider",
			)}
		>
			{props.masked && !isHovered ? (
				maskedValue
			) : (
				<AnimatedNumber
					key={props.currency}
					value={props.total_amount}
					currency={props.currency}
					maximumFractionDigits={0}
					minimumFractionDigits={0}
				/>
			)}
		</button>
	);

	return (
		<ResponsiveMetric
			title={props.title || ""}
			value={value}
			subtitle={props.subtitle}
		/>
	);
}
