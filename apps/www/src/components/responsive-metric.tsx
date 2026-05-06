"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import type { ComponentType, ReactNode } from "react";

type MetricIcon = ComponentType<{ className?: string }>;

interface ResponsiveMetricProps {
	title: string;
	value: ReactNode;
	subtitle?: ReactNode;
	icon?: MetricIcon;
	className?: string;
}

export function ResponsiveMetric({
	title,
	value,
	subtitle,
	icon: Icon,
	className,
}: ResponsiveMetricProps) {
	return (
		<Card
			className={cn(
				"min-w-0 rounded-none border-0 border-border/70 border-t bg-transparent shadow-none first:border-t-0 odd:border-r sm:rounded-lg sm:border sm:bg-card sm:shadow-sm sm:first:border-t sm:odd:border-r-0",
				className,
			)}
		>
			<div className="px-3 py-2.5 sm:hidden">
				<div className="flex min-w-0 items-start justify-between gap-2">
					<div className="min-w-0">
						<div className="truncate text-[11px] font-medium uppercase leading-4 text-muted-foreground">
							{title}
						</div>
						<div className="mt-0.5 min-w-0 truncate text-lg font-semibold leading-6 text-foreground">
							{value}
						</div>
					</div>
					{Icon ? (
						<Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
					) : null}
				</div>
				{subtitle ? (
					<div className="mt-1 truncate text-xs leading-4 text-muted-foreground">
						{subtitle}
					</div>
				) : null}
			</div>

			<div className="hidden sm:block">
				<CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
					<CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
					{Icon ? (
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<Icon className="size-4" />
						</span>
					) : null}
				</CardHeader>
				<CardContent className="min-w-0 space-y-1">
					<div className="min-w-0 truncate text-2xl font-semibold text-foreground">
						{value}
					</div>
					{subtitle ? (
						<p className="truncate text-xs text-muted-foreground">{subtitle}</p>
					) : null}
				</CardContent>
			</div>
		</Card>
	);
}
