"use client";

import { writeSalesRequestGenerationHandoff } from "@/components/forms/new-sales-form/request-generation-handoff";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { getSalesRequestMailboxDraftPath } from "./sales-request-mailbox-route";

const STATUSES = [
	"new",
	"processing",
	"needs-review",
	"ready-to-apply",
	"completed",
	"dismissed",
	"failed",
] as const;

type InboxStatus = (typeof STATUSES)[number];
type InboxItem =
	RouterOutputs["salesRequestMailbox"]["listInbox"]["items"][number];
type Connection =
	RouterOutputs["salesRequestMailbox"]["connections"]["items"][number];
type InboxInput = RouterInputs["salesRequestMailbox"]["listInbox"];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

function providerLabel(provider: Connection["provider"]) {
	return provider === "gmail" ? "Gmail" : "Microsoft";
}

function statusLabel(status: InboxStatus) {
	return status
		.split("-")
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join(" ");
}

function connectionLabel(connection: Connection) {
	return (
		connection.displayName?.trim() ||
		connection.accountEmail?.trim() ||
		providerLabel(connection.provider)
	);
}

export function SalesRequestMailboxPage() {
	const trpc = useTRPC();
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const [connectionId, setConnectionId] = useState("");
	const [queueIdentity, setQueueIdentity] = useState("");
	const [status, setStatus] = useState<"all" | InboxStatus>("all");
	const [search, setSearch] = useState("");
	const [appliedSearch, setAppliedSearch] = useState("");
	const [cursor, setCursor] = useState<string | undefined>();
	const [previousCursors, setPreviousCursors] = useState<
		Array<string | undefined>
	>([]);

	const connectionsQuery = useQuery(
		trpc.salesRequestMailbox.connections.queryOptions(),
	);
	const connections = (connectionsQuery.data?.items ?? []).filter(
		(connection) => connection.state === "active",
	);
	const activeConnection = connections.find(
		(connection) => connection.connectionId === connectionId,
	);

	useEffect(() => {
		if (!connectionId && connections[0]) {
			setConnectionId(connections[0].connectionId);
		}
	}, [connectionId, connections]);

	useEffect(() => {
		const outcome = searchParams.get("mailbox");
		if (!outcome) return;
		if (outcome === "connected") {
			toast({ title: "Mailbox connected" });
		} else if (outcome === "cancelled") {
			toast({ title: "Connection cancelled" });
		} else {
			toast({
				variant: "destructive",
				title: "Unable to connect mailbox",
			});
		}
		router.replace("/sales-book/requests");
	}, [router, searchParams]);

	const inboxInput = useMemo(
		() =>
			({
				connectionId,
				limit: 50,
				...(status === "all" ? {} : { status }),
				...(appliedSearch ? { search: appliedSearch } : {}),
				...(cursor ? { cursor } : {}),
			}) satisfies InboxInput,
		[appliedSearch, connectionId, cursor, status],
	);
	const inboxQuery = useQuery(
		trpc.salesRequestMailbox.listInbox.queryOptions(inboxInput, {
			enabled: Boolean(connectionId),
		}),
	);
	const items = inboxQuery.data?.items ?? [];

	useEffect(() => {
		if (!queueIdentity && items[0]) setQueueIdentity(items[0].queueIdentity);
		if (
			queueIdentity &&
			items.length > 0 &&
			!items.some((item) => item.queueIdentity === queueIdentity)
		) {
			setQueueIdentity(items[0]?.queueIdentity ?? "");
		}
	}, [items, queueIdentity]);

	const detailQuery = useQuery(
		trpc.salesRequestMailbox.getInboxDetail.queryOptions(
			{ connectionId, queueIdentity },
			{ enabled: Boolean(connectionId && queueIdentity) },
		),
	);

	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.salesRequestMailbox.connections.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesRequestMailbox.listInbox.pathKey(),
			}),
		]);
	};

	const connectMutation = useMutation(
		trpc.salesRequestMailbox.beginConnect.mutationOptions({
			onSuccess(result) {
				if (result.kind === "authorization-ready") {
					window.location.assign(result.authorizationUrl);
					return;
				}
				toast({
					variant: "destructive",
					title: "Mailbox connection unavailable",
				});
			},
			onError() {
				toast({
					variant: "destructive",
					title: "Unable to connect mailbox",
				});
			},
		}),
	);

	const disconnectMutation = useMutation(
		trpc.salesRequestMailbox.disconnect.mutationOptions({
			async onSuccess(result) {
				if (result.kind === "rejected") {
					toast({
						variant: "destructive",
						title: "Unable to disconnect mailbox",
						description: result.reason,
					});
					return;
				}
				setConnectionId("");
				setQueueIdentity("");
				await refresh();
			},
			onError() {
				toast({
					variant: "destructive",
					title: "Unable to disconnect mailbox",
				});
			},
		}),
	);

	const previewMutation = useMutation(
		trpc.salesRequestMailbox.generatePreview.mutationOptions({
			onSuccess(preview, variables) {
				writeSalesRequestGenerationHandoff(preview);
				const next = new URLSearchParams({
					salesRequestGeneration: preview.generationId,
				});
				const selectedCustomerId = searchParams.get("selectedCustomerId");
				if (selectedCustomerId) {
					next.set("selectedCustomerId", selectedCustomerId);
				}
				router.push(
					`${getSalesRequestMailboxDraftPath(variables.type)}?${next.toString()}`,
				);
			},
			onError() {
				toast({
					variant: "destructive",
					title: "Unable to create draft",
				});
			},
		}),
	);

	function applySearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPreviousCursors([]);
		setCursor(undefined);
		setAppliedSearch(search.trim());
	}

	function changeStatus(next: string) {
		setStatus(next as "all" | InboxStatus);
		setPreviousCursors([]);
		setCursor(undefined);
		setQueueIdentity("");
	}

	if (connectionsQuery.isError) {
		return (
			<Card>
				<CardContent className="flex min-h-60 flex-col items-center justify-center gap-4 p-6 text-center">
					<p className="text-sm text-destructive">Unable to load mailboxes.</p>
					<Button variant="outline" onClick={() => connectionsQuery.refetch()}>
						Try again
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				{connections.length ? (
					<Select
						value={connectionId}
						onValueChange={(value) => {
							setConnectionId(value);
							setQueueIdentity("");
							setCursor(undefined);
							setPreviousCursors([]);
						}}
					>
						<SelectTrigger className="w-full sm:w-72" aria-label="Mailbox">
							<SelectValue placeholder="Select mailbox" />
						</SelectTrigger>
						<SelectContent>
							{connections.map((connection) => (
								<SelectItem
									key={connection.connectionId}
									value={connection.connectionId}
								>
									{connectionLabel(connection)} ·{" "}
									{providerLabel(connection.provider)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				<Button
					variant="outline"
					onClick={() => connectMutation.mutate({ provider: "gmail" })}
					disabled={connectMutation.isPending}
				>
					Connect Gmail
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						connectMutation.mutate({ provider: "microsoft-graph" })
					}
					disabled={connectMutation.isPending}
				>
					Connect Microsoft
				</Button>
				<div className="ml-auto flex gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => void refresh()}
						disabled={inboxQuery.isFetching}
						aria-label="Refresh requests"
					>
						<Icons.RefreshCw
							className={cn("size-4", inboxQuery.isFetching && "animate-spin")}
						/>
					</Button>
					{activeConnection ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="ghost" disabled={disconnectMutation.isPending}>
									Disconnect
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent size="sm">
								<AlertDialogHeader>
									<AlertDialogTitle>Disconnect mailbox?</AlertDialogTitle>
									<AlertDialogDescription>
										This removes its stored access and request data.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										variant="destructive"
										onClick={() =>
											disconnectMutation.mutate({
												connectionId: activeConnection.connectionId,
												expectedConnectionRevision: activeConnection.revision,
											})
										}
									>
										Disconnect
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : null}
				</div>
			</div>

			{connections.length === 0 && !connectionsQuery.isPending ? (
				<Card>
					<CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
						<Icons.Inbox className="size-6 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							Connect a mailbox to begin.
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Tabs value={status} onValueChange={changeStatus}>
							<TabsList className="h-auto max-w-full justify-start overflow-x-auto">
								<TabsTrigger value="all">All</TabsTrigger>
								{STATUSES.map((item) => (
									<TabsTrigger key={item} value={item}>
										{statusLabel(item)}
										{inboxQuery.data
											? ` ${inboxQuery.data.statusCounts[item]}`
											: ""}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
						<form onSubmit={applySearch} className="flex w-full gap-2 sm:w-80">
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search"
								aria-label="Search mailbox requests"
								maxLength={120}
							/>
							<Button
								type="submit"
								variant="outline"
								size="icon"
								aria-label="Search"
							>
								<Icons.Search className="size-4" />
							</Button>
						</form>
					</div>

					<Card className="overflow-hidden">
						<CardContent className="grid min-h-[520px] p-0 lg:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]">
							<div className="max-h-[70vh] overflow-y-auto border-b lg:border-b-0 lg:border-r">
								{inboxQuery.isPending ? (
									<div className="flex min-h-48 items-center justify-center">
										<Icons.Loader2 className="size-5 animate-spin" />
									</div>
								) : inboxQuery.isError ? (
									<div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-sm text-destructive">
										Unable to load requests.
										<Button
											variant="outline"
											size="sm"
											onClick={() => inboxQuery.refetch()}
										>
											Try again
										</Button>
									</div>
								) : items.length ? (
									items.map((item: InboxItem) => (
										<button
											type="button"
											key={item.queueIdentity}
											onClick={() => setQueueIdentity(item.queueIdentity)}
											className={cn(
												"block w-full border-b p-4 text-left transition-colors hover:bg-muted/50",
												queueIdentity === item.queueIdentity && "bg-muted",
											)}
										>
											<div className="flex items-start justify-between gap-3">
												<p className="truncate text-sm font-medium">
													{item.subject || "No subject"}
												</p>
												<span className="shrink-0 text-xs text-muted-foreground">
													{dateFormatter.format(new Date(item.receivedAt))}
												</span>
											</div>
											<p className="mt-1 truncate text-xs text-muted-foreground">
												{item.fromName || item.fromEmail}
											</p>
											<Badge variant="outline" className="mt-2">
												{statusLabel(item.status)}
											</Badge>
										</button>
									))
								) : (
									<div className="flex min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">
										No requests found.
									</div>
								)}
								<div className="flex items-center justify-between p-3">
									<Button
										variant="ghost"
										size="sm"
										disabled={previousCursors.length === 0}
										onClick={() => {
											const previous = [...previousCursors];
											setCursor(previous.pop());
											setPreviousCursors(previous);
										}}
									>
										Previous
									</Button>
									<Button
										variant="ghost"
										size="sm"
										disabled={!inboxQuery.data?.nextCursor}
										onClick={() => {
											setPreviousCursors((values) => [...values, cursor]);
											setCursor(inboxQuery.data?.nextCursor ?? undefined);
										}}
									>
										Next
									</Button>
								</div>
							</div>

							<div className="min-w-0 p-5">
								{detailQuery.isPending && queueIdentity ? (
									<div className="flex min-h-48 items-center justify-center">
										<Icons.Loader2 className="size-5 animate-spin" />
									</div>
								) : detailQuery.isError ? (
									<div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-destructive">
										Unable to load request.
										<Button
											variant="outline"
											size="sm"
											onClick={() => detailQuery.refetch()}
										>
											Try again
										</Button>
									</div>
								) : detailQuery.data ? (
									<div className="space-y-5">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0">
												<h2 className="truncate font-medium">
													{detailQuery.data.subject || "No subject"}
												</h2>
												<p className="mt-1 truncate text-sm text-muted-foreground">
													{detailQuery.data.fromName
														? `${detailQuery.data.fromName} · ${detailQuery.data.fromEmail}`
														: detailQuery.data.fromEmail}
												</p>
											</div>
											<div className="flex gap-2">
												{(["quote", "order"] as const).map((type) => (
													<Button
														key={type}
														variant={type === "quote" ? "outline" : "default"}
														onClick={() =>
															previewMutation.mutate({
																queueIdentity: detailQuery.data.queueIdentity,
																type,
															})
														}
														disabled={previewMutation.isPending}
													>
														{previewMutation.isPending ? (
															<Icons.Loader2 className="size-4 animate-spin" />
														) : type === "order" ? (
															<Icons.Sparkles className="size-4" />
														) : null}
														{type === "order" ? "Order draft" : "Quote draft"}
													</Button>
												))}
											</div>
										</div>
										<div className="whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-4 text-sm leading-6">
											{detailQuery.data.displayText}
										</div>
									</div>
								) : (
									<div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
										Select a request.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
