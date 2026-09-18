"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@gnd/ui/empty";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import { SettingsCard } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

function categoryLabel(category: string) {
	return category
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/^\w|\s\w/g, (character) => character.toUpperCase());
}

function WarningsSkeleton() {
	return (
		<div className="flex flex-col gap-5" aria-label="Loading AI warnings">
			<div className="grid gap-3 sm:grid-cols-3">
				{["occurrences", "warnings", "instructions"].map((key) => (
					<Skeleton className="h-16 rounded-md" key={key} />
				))}
			</div>
			<Skeleton className="h-40 rounded-md" />
		</div>
	);
}

export function SalesRequestInterpretationWarningsSection() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const query = useQuery(
		trpc.salesRequest.listInterpretationWarnings.queryOptions(),
	);
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const update = useMutation(
		trpc.salesRequest.setInterpretationWarningGuidanceByKey.mutationOptions({
			async onSuccess(data) {
				setPendingKey(null);
				await queryClient.invalidateQueries({
					queryKey: trpc.salesRequest.listInterpretationWarnings.queryKey(),
				});
				toast({
					variant: "success",
					title: data.active
						? "Warning hidden for all future requests"
						: "Warning restored",
					description: data.active
						? "Its interpretation is now included as a global instruction for Request AI."
						: "Future requests may show this interpretation warning again.",
				});
			},
			onError(error) {
				setPendingKey(null);
				toast({
					variant: "destructive",
					title: "Unable to update warning",
					description: error.message,
				});
			},
		}),
	);

	if (query.isError) {
		return (
			<SettingsQueryError
				title="Unable to load interpretation warnings"
				description={query.error.message}
				onRetry={() => void query.refetch()}
			/>
		);
	}

	return (
		<SettingsCard
			title="Interpretation warnings"
			description="Review how Request AI translated customer wording into catalog selections. Hidden warnings become global instructions for all future requests."
		>
			{query.isPending ? (
				<WarningsSkeleton />
			) : (
				<div className="flex flex-col gap-6">
					<div className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-md border p-3">
							<p className="text-2xl font-semibold tabular-nums">
								{query.data.summary.occurrenceCount.toLocaleString()}
							</p>
							<p className="text-xs text-muted-foreground">Total occurrences</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-2xl font-semibold tabular-nums">
								{query.data.summary.warningCount.toLocaleString()}
							</p>
							<p className="text-xs text-muted-foreground">Unique warnings</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-2xl font-semibold tabular-nums">
								{query.data.summary.doNotShowCount.toLocaleString()}
							</p>
							<p className="text-xs text-muted-foreground">
								Used as instructions
							</p>
						</div>
					</div>

					{query.data.categories.length === 0 ? (
						<Empty className="border">
							<EmptyHeader>
								<EmptyTitle>No interpretation warnings</EmptyTitle>
								<EmptyDescription>
									Warnings recorded from generated sales drafts will appear
									here.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						query.data.categories.map((group) => (
							<section
								key={group.category}
								aria-labelledby={`interpretation-warning-${group.category}`}
								className="flex flex-col gap-4"
							>
								<div className="flex flex-wrap items-center gap-2">
									<h3
										id={`interpretation-warning-${group.category}`}
										className="text-sm font-semibold"
									>
										{categoryLabel(group.category)}
									</h3>
									<Badge variant="secondary">
										{group.warningCount.toLocaleString()} warnings
									</Badge>
									<Badge variant="outline">
										{group.occurrenceCount.toLocaleString()} occurrences
									</Badge>
									{group.doNotShowCount > 0 ? (
										<Badge variant="outline">
											{group.doNotShowCount.toLocaleString()} hidden
										</Badge>
									) : null}
								</div>

								<div className="rounded-md border">
									{group.warnings.map((warning, index) => {
										const isPending =
											update.isPending && pendingKey === warning.key;
										return (
											<div key={warning.key}>
												{index > 0 ? <Separator /> : null}
												<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
													<div className="min-w-0 flex flex-col gap-2">
														<div className="flex flex-wrap items-center gap-2">
															<p className="text-sm font-medium">
																{warning.selectedTitle}
															</p>
															<Badge
																variant={
																	warning.doNotShow ? "secondary" : "outline"
																}
															>
																{warning.doNotShow
																	? "Instruction active"
																	: "Shown in drafts"}
															</Badge>
															<Badge variant="outline">
																{warning.occurrenceCount.toLocaleString()} times
															</Badge>
														</div>
														<p className="text-sm text-muted-foreground">
															“{warning.sourceText}” was interpreted as{" "}
															{warning.selectedTitle}.
														</p>
														{warning.reason ? (
															<p className="text-xs text-muted-foreground">
																{warning.reason}
															</p>
														) : null}
													</div>
													<Button
														type="button"
														variant="outline"
														disabled={!warning.eligible || update.isPending}
														onClick={() => {
															setPendingKey(warning.key);
															update.mutate({
																key: warning.key,
																active: !warning.doNotShow,
															});
														}}
													>
														{isPending
															? "Updating…"
															: warning.doNotShow
																? "Show warning again"
																: "Don’t show again"}
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							</section>
						))
					)}
				</div>
			)}
		</SettingsCard>
	);
}
