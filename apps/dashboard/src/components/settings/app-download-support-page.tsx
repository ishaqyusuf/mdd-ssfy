"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useState } from "react";

type Platform = "ANDROID" | "IOS";
type AdminRequest = RouterOutputs["mobileAccess"]["adminList"][number];
type AdminDraft = {
	statusNote?: string;
	internalNote?: string;
	externalReference?: string;
};

const statusLabels = {
	REQUESTED: "Requested",
	APPROVED: "Approved",
	INVITED: "Invited",
	ACCEPTED: "Accepted",
	INSTALLED: "Installed",
	REJECTED: "Rejected",
	CANCELLED: "Cancelled",
} as const;

function statusLabel(status: keyof typeof statusLabels, platform: Platform) {
	return platform === "IOS" && status === "INVITED"
		? "Guidance sent"
		: statusLabels[status];
}

export function AppDownloadSupportPage() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
	const [drafts, setDrafts] = useState<Record<number, AdminDraft>>({});

	const myRequests = useQuery(
		trpc.mobileAccess.myRequests.queryOptions(undefined, {
			enabled: auth.enabled,
		}),
	);
	const adminRequests = useQuery(
		trpc.mobileAccess.adminList.queryOptions(undefined, {
			enabled: auth.enabled && isSuperAdmin,
		}),
	);

	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.mobileAccess.myRequests.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.mobileAccess.adminList.queryKey(),
			}),
		]);
	};
	const requestAccess = useMutation(
		trpc.mobileAccess.request.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({ title: "Mobile access requested", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to request access",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const updateRequest = useMutation(
		trpc.mobileAccess.adminUpdate.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({ title: "Mobile access status updated", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to update request",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<div className="space-y-8">
			<section className="grid gap-4 md:grid-cols-2">
				<PlatformAccessCard
					platform="IOS"
					request={myRequests.data?.find((item) => item.platform === "IOS")}
					isPending={requestAccess.isPending}
					onRequest={() => requestAccess.mutate({ platform: "IOS" })}
				/>
				<PlatformAccessCard
					platform="ANDROID"
					request={myRequests.data?.find((item) => item.platform === "ANDROID")}
					isPending={requestAccess.isPending}
					onRequest={() => requestAccess.mutate({ platform: "ANDROID" })}
				/>
			</section>

			{isSuperAdmin ? (
				<section className="overflow-hidden rounded-md border bg-background">
					<div className="border-b p-4">
						<h2 className="font-semibold">Employee access requests</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Review account access here. For iOS, send public App Store guidance
							only after release; Android distribution remains admin-managed.
							Record each verified step. Never enter Apple passwords or codes.
						</p>
					</div>
					<div className="divide-y">
						{adminRequests.isLoading ? (
							<p className="p-4 text-sm text-muted-foreground">
								Loading access requests…
							</p>
						) : adminRequests.data?.length ? (
							adminRequests.data.map((request) => (
								<AdminRequestRow
									key={request.id}
									request={request}
									draft={drafts[request.id] ?? {}}
									isPending={updateRequest.isPending}
									onDraftChange={(draft) =>
										setDrafts((current) => ({
											...current,
											[request.id]: draft,
										}))
									}
									onStatus={(status) =>
										updateRequest.mutate({
											id: request.id,
											status,
											...drafts[request.id],
										})
									}
								/>
							))
						) : (
							<p className="p-4 text-sm text-muted-foreground">
								No employee requests yet.
							</p>
						)}
					</div>
				</section>
			) : null}
		</div>
	);
}

function PlatformAccessCard({
	platform,
	request,
	isPending,
	onRequest,
}: {
	platform: Platform;
	request?: RouterOutputs["mobileAccess"]["myRequests"][number];
	isPending: boolean;
	onRequest: () => void;
}) {
	const canRequest =
		!request || request.status === "REJECTED" || request.status === "CANCELLED";
	const canDownloadAndroid =
		platform === "ANDROID" &&
		request &&
		["INVITED", "ACCEPTED", "INSTALLED"].includes(request.status);
	return (
		<div className="rounded-md border bg-background p-5">
			<div className="flex items-start justify-between gap-4">
				<div className="flex gap-3">
					<div className="flex size-10 items-center justify-center rounded-full bg-muted">
						<Smartphone aria-hidden="true" className="size-5" />
					</div>
					<div>
						<h2 className="font-semibold">
							{platform === "IOS" ? "iPhone / iPad" : "Android"}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{platform === "IOS"
								? "After public release, download GND Millwork from the App Store. A company account is still required to sign in."
								: "Access is approved and delivered by a GND administrator."}
						</p>
					</div>
				</div>
				{request ? (
					<Badge variant="outline">
						{statusLabel(request.status, platform)}
					</Badge>
				) : null}
			</div>
			{request?.statusNote ? (
				<p className="mt-4 rounded-md bg-muted p-3 text-sm">
					{request.statusNote}
				</p>
			) : null}
			<div className="mt-5 flex flex-wrap gap-2">
				{canRequest ? (
					<Button disabled={isPending} onClick={onRequest}>
						Request {platform === "IOS" ? "iOS" : "Android"} access
					</Button>
				) : (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<CheckCircle2 aria-hidden="true" className="size-4" />
						Request recorded
					</div>
				)}
				{canDownloadAndroid ? (
					<Button asChild variant="outline">
						<a href="/api/download-app" aria-label="Download GND Android app">
							<Download aria-hidden="true" className="mr-2 size-4" />
							Download Android app
						</a>
					</Button>
				) : null}
			</div>
		</div>
	);
}

function AdminRequestRow({
	request,
	draft,
	isPending,
	onDraftChange,
	onStatus,
}: {
	request: AdminRequest;
	draft: AdminDraft;
	isPending: boolean;
	onDraftChange: (draft: AdminDraft) => void;
	onStatus: (status: AdminRequest["nextStatuses"][number]) => void;
}) {
	return (
		<div className="grid gap-4 p-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)]">
			<div>
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-medium">
						{request.requester.name ?? request.requester.email}
					</p>
					<Badge variant="secondary">
						{request.platform === "IOS" ? "iOS" : "Android"}
					</Badge>
					<Badge variant="outline">
						{statusLabel(request.status, request.platform)}
					</Badge>
				</div>
				<p className="mt-1 text-sm text-muted-foreground">
					{request.requester.email}
				</p>
				<p className="mt-2 text-xs text-muted-foreground">
					Requested {new Date(request.requestedAt).toLocaleString()}
				</p>
			</div>
			<div className="space-y-3">
				<Textarea
					value={draft.statusNote ?? ""}
					onChange={(event) =>
						onDraftChange({ ...draft, statusNote: event.target.value })
					}
					placeholder="Optional note visible to the employee"
					aria-label="Employee-visible status note"
					className="min-h-20"
				/>
				<div className="grid gap-2 sm:grid-cols-2">
					<Input
						value={draft.internalNote ?? ""}
						onChange={(event) =>
							onDraftChange({ ...draft, internalNote: event.target.value })
						}
						placeholder="Internal note (optional)"
						aria-label="Internal admin note"
					/>
					<Input
						value={draft.externalReference ?? ""}
						onChange={(event) =>
							onDraftChange({ ...draft, externalReference: event.target.value })
						}
						placeholder="Distribution reference (optional)"
						aria-label="External distribution reference"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					{request.nextStatuses.map((status) => (
						<Button
							key={status}
							disabled={isPending}
							variant={
								status === "REJECTED" || status === "CANCELLED"
									? "outline"
									: "default"
							}
							onClick={() => onStatus(status)}
						>
							Mark {statusLabel(status, request.platform)}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
