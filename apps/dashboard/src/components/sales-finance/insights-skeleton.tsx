"use client";

import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

export function SalesFinanceInsightsSkeleton() {
	return (
		<section aria-label="Finance reporting snapshot" className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="space-y-1">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-72 max-w-full" />
				</div>
				<Skeleton className="h-5 w-28" />
			</div>
			<div className="grid gap-3 lg:grid-cols-12">
				<Card className="rounded-xl shadow-sm lg:col-span-8">
					<CardHeader className="space-y-2 p-4 pb-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-52 max-w-full" />
					</CardHeader>
					<CardContent className="p-4 pt-2">
						<Skeleton className="h-[260px] w-full" />
					</CardContent>
				</Card>
				<Card className="rounded-xl shadow-sm lg:col-span-4">
					<CardHeader className="space-y-2 p-4 pb-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-3 w-44 max-w-full" />
					</CardHeader>
					<CardContent className="space-y-5 p-4 pt-3">
						{["method-1", "method-2", "method-3", "method-4"].map((id) => (
							<div key={id} className="space-y-2">
								<div className="flex justify-between gap-3">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-3 w-24" />
								</div>
								<Skeleton className="h-1.5 w-full rounded-full" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card className="rounded-xl shadow-sm lg:col-span-12">
					<CardHeader className="space-y-2 p-4 pb-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-3 w-64 max-w-full" />
					</CardHeader>
					<CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
						{["age-1", "age-2", "age-3", "age-4"].map((id) => (
							<Skeleton key={id} className="h-24 rounded-lg" />
						))}
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
