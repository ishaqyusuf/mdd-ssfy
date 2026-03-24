"use client";

import { reviewEmployeeDocument } from "@/app/(sidebar)/hrm/document-approvals/_actions/review-employee-document";
import { Avatar } from "@/components/avatar";
import { Inbox } from "@/components/chat";
import { FileViewer } from "@/components/file-viewer";
import { useDocumentReviewParams } from "@/hooks/use-document-review-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

function inferMimeType(url: string) {
	const normalized = url.toLowerCase();
	if (normalized.endsWith(".pdf")) return "application/pdf";
	if (normalized.endsWith(".png")) return "image/png";
	if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg"))
		return "image/jpeg";
	if (normalized.endsWith(".webp")) return "image/webp";
	if (normalized.endsWith(".gif")) return "image/gif";
	return null;
}

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

function badgeVariant(status?: "pending" | "approved" | "rejected" | null) {
	if (status === "approved") return "success";
	if (status === "rejected") return "destructive";
	return "outline";
}

export function DocumentReviewModal() {
	const { params, opened, setParams } = useDocumentReviewParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const documentId = params.openDocumentReviewId ?? 0;
	const { data, isPending } = useQuery({
		...trpc.user.getDocumentReview.queryOptions({ id: documentId }),
		enabled: documentId > 0,
	});

	const saveNoteMutation = useMutation(
		trpc.user.saveDocumentReviewNote.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.notes.activityTree.pathKey(),
				});
			},
			onError: (error) => {
				toast.error(error.message ?? "Unable to save note");
			},
		}),
	);

	const reviewMutation = useMutation({
		mutationFn: async (status: "approved" | "rejected") => {
			if (!documentId) throw new Error("Missing document");
			await reviewEmployeeDocument(documentId, status);
		},
		onSuccess: async (_, status) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.user.getDocumentReview.queryKey({ id: documentId }),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.notes.activityTree.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.notes.list.pathKey(),
				}),
			]);
			toast.success(
				status === "approved" ? "Document approved" : "Document rejected",
			);
		},
		onError: (error) => {
			toast.error(error.message ?? "Unable to update document review");
		},
	});

	const mimeType = useMemo(
		() => (data?.url ? inferMimeType(data.url) : null),
		[data?.url],
	);

	return (
		<Dialog open={opened} onOpenChange={() => setParams(null)}>
			<DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden p-0">
				<div className="grid h-[90vh] max-h-[90vh] grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
					<div className="flex min-h-0 flex-col border-r">
						<DialogHeader className="px-6 py-5">
							<DialogTitle>Document Review</DialogTitle>
							<DialogDescription>
								Open the uploaded document, review it, and keep notes in one
								place.
							</DialogDescription>
						</DialogHeader>
						<Separator />
						<div className="flex items-center justify-between px-6 py-4">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{data?.title || "Insurance"}
								</p>
								<p className="text-xs text-muted-foreground">
									Uploaded {formatDate(data?.createdAt)}
								</p>
							</div>
							{data?.url ? (
								<Button variant="outline" asChild>
									<a href={data.url} target="_blank" rel="noreferrer">
										<ExternalLink className="mr-2 h-4 w-4" />
										Open Document
									</a>
								</Button>
							) : null}
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-6">
							<div className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-xl border bg-background">
								{data?.url && mimeType ? (
									<FileViewer
										url={data.url}
										mimeType={mimeType}
										maxWidth={720}
									/>
								) : data?.url ? (
									<a
										href={data.url}
										target="_blank"
										rel="noreferrer"
										className="text-sm text-primary underline"
									>
										Open uploaded document
									</a>
								) : isPending ? (
									<p className="text-sm text-muted-foreground">
										Loading document...
									</p>
								) : (
									<p className="text-sm text-muted-foreground">
										Document preview unavailable
									</p>
								)}
							</div>
						</div>
					</div>

					<div className="flex min-h-0 flex-col">
						<div className="space-y-4 px-6 py-5">
							<div className="flex items-start gap-3">
								<Avatar
									url={data?.user.avatarUrl}
									name={data?.user.name}
									email={data?.user.email}
									className="h-10 w-10"
								/>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="font-medium">
											{data?.user.name || "Employee"}
										</p>
										<Badge variant={badgeVariant(data?.status)}>
											{data?.status || "pending"}
										</Badge>
									</div>
									<p className="text-sm text-muted-foreground">
										{data?.user.email || "-"}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3 text-sm">
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">Uploaded</p>
									<p className="font-medium">{formatDate(data?.createdAt)}</p>
								</div>
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">Expires</p>
									<p className="font-medium">{formatDate(data?.expiresAt)}</p>
								</div>
							</div>

							{data?.description ? (
								<div className="rounded-lg border p-3 text-sm text-muted-foreground">
									{data.description}
								</div>
							) : null}

							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									disabled={
										reviewMutation.isPending || data?.status === "approved"
									}
									onClick={() => reviewMutation.mutate("approved")}
								>
									Approve
								</Button>
								<Button
									variant="outline"
									disabled={
										reviewMutation.isPending || data?.status === "rejected"
									}
									onClick={() => reviewMutation.mutate("rejected")}
								>
									Reject
								</Button>
							</div>
						</div>

						<Separator />

						<ScrollArea className="flex-1 px-6 py-5">
							{data ? (
								<Inbox
									className="min-h-full"
									activityHistoryProps={{
										channel: "employee_document_review",
										tags: [{ tagName: "documentId", tagValue: data.id }],
										emptyText: "No activity yet",
									}}
									chatProps={{
										channel: "employee_document_review",
										messageRequired: true,
										placeholder: "Add a review note...",
										onSubmitData: async (payload) => {
											await saveNoteMutation.mutateAsync({
												documentId: data.id,
												userId: data.user.id,
												title: data.title || "Insurance",
												note: payload.message || "",
											});
										},
									}}
								/>
							) : null}
						</ScrollArea>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
