"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useQuery } from "@gnd/ui/tanstack";
import { useState } from "react";

type AdoptionData = RouterOutputs["newSalesForm"]["adoption"];
type AdoptionUser = AdoptionData["users"][number];

export function SalesFormAdoptionPage() {
	const [days, setDays] = useState<7 | 30 | 90>(30);
	const trpc = useTRPC();
	const query = useQuery(
		trpc.newSalesForm.adoption.queryOptions({ days }, { staleTime: 60_000 }),
	);

	if (query.isPending) {
		return <SalesFormAdoptionSkeleton />;
	}
	if (query.error) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
				{query.error.message}
			</div>
		);
	}
	if (!query.data) return null;

	const data = query.data;
	const totalUsage = data.usage.new.views + data.usage.legacy.views;
	const newShare = totalUsage
		? Math.round((data.usage.new.views / totalUsage) * 100)
		: 0;

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="flex justify-end">
				<Select
					value={String(days)}
					onValueChange={(value) => setDays(Number(value) as 7 | 30 | 90)}
				>
					<SelectTrigger className="w-[160px]" aria-label="Adoption period">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="7">Last 7 days</SelectItem>
						<SelectItem value="30">Last 30 days</SelectItem>
						<SelectItem value="90">Last 90 days</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					title="New-form preference"
					value={data.summary.explicitNew}
					description="Users who explicitly chose the new form"
				/>
				<MetricCard
					title="Legacy preference"
					value={data.summary.explicitLegacy}
					description="Users who asked to keep the legacy form"
				/>
				<MetricCard
					title="No saved preference"
					value={data.summary.unconfiguredObserved}
					description="Observed users still using the new-form default"
				/>
				<MetricCard
					title="New-form usage"
					value={`${newShare}%`}
					description={`${data.usage.new.views} of ${totalUsage} recorded opens`}
				/>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<UsageCard
					title="New sales form"
					views={data.usage.new.views}
					users={data.usage.new.uniqueUsers}
				/>
				<UsageCard
					title="Legacy sales form"
					views={data.usage.legacy.views}
					users={data.usage.legacy.uniqueUsers}
				/>
			</div>

			<Card className="overflow-hidden rounded-lg">
				<CardHeader className="p-4">
					<CardTitle className="mb-0 text-base">User adoption</CardTitle>
					<CardDescription>
						Current preference and form opens during the selected period.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Preference</TableHead>
									<TableHead className="text-right">New opens</TableHead>
									<TableHead className="text-right">Legacy opens</TableHead>
									<TableHead>Last activity</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.users.length ? (
									data.users.map((user) => (
										<AdoptionUserRow key={user.userId} user={user} />
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-32 text-center text-muted-foreground"
										>
											No sales-form activity has been recorded yet.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function MetricCard({
	title,
	value,
	description,
}: {
	title: string;
	value: number | string;
	description: string;
}) {
	return (
		<Card className="rounded-lg">
			<CardHeader className="p-4 pb-2">
				<CardDescription>{title}</CardDescription>
				<CardTitle className="mb-0 font-mono text-2xl">{value}</CardTitle>
			</CardHeader>
			<CardContent className="p-4 pt-0 text-xs text-muted-foreground">
				{description}
			</CardContent>
		</Card>
	);
}

function UsageCard({
	title,
	views,
	users,
}: {
	title: string;
	views: number;
	users: number;
}) {
	return (
		<Card className="rounded-lg">
			<CardHeader className="p-4">
				<CardTitle className="mb-0 text-base">{title}</CardTitle>
				<CardDescription>
					{views.toLocaleString()} opens from {users.toLocaleString()}{" "}
					{users === 1 ? "user" : "users"}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

function AdoptionUserRow({ user }: { user: AdoptionUser }) {
	const latestActivity = latestDate([
		user.preferenceUpdatedAt,
		user.lastNewViewedAt,
		user.lastLegacyViewedAt,
	]);

	return (
		<TableRow>
			<TableCell>
				<div className="min-w-[180px]">
					<p className="font-medium">{user.name || "Unnamed user"}</p>
					<p className="text-xs text-muted-foreground">{user.email}</p>
				</div>
			</TableCell>
			<TableCell>{user.role || "No role"}</TableCell>
			<TableCell>
				<PreferenceBadge preference={user.preference} />
			</TableCell>
			<TableCell className="text-right font-mono">{user.newViews}</TableCell>
			<TableCell className="text-right font-mono">{user.legacyViews}</TableCell>
			<TableCell className="whitespace-nowrap text-muted-foreground">
				{formatDate(latestActivity)}
			</TableCell>
		</TableRow>
	);
}

function PreferenceBadge({
	preference,
}: {
	preference: "NEW" | "LEGACY" | null;
}) {
	if (preference === "NEW") return <Badge variant="success">New</Badge>;
	if (preference === "LEGACY") {
		return <Badge variant="secondary">Legacy</Badge>;
	}
	return <Badge variant="outline">Default new</Badge>;
}

function latestDate(values: Array<string | Date | null>) {
	return values.reduce<Date | null>((latest, value) => {
		if (!value) return latest;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return latest;
		return !latest || date > latest ? date : latest;
	}, null);
}

function formatDate(value: Date | null) {
	if (!value) return "No activity";
	return value.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function SalesFormAdoptionSkeleton() {
	const cards = ["new", "legacy", "default", "share"] as const;
	return (
		<div className="space-y-4" aria-label="Loading sales form adoption">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{cards.map((card) => (
					<div
						key={card}
						className="h-28 animate-pulse rounded-lg border bg-muted/40"
					/>
				))}
			</div>
			<div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
		</div>
	);
}
