"use client";

import { Avatar } from "@/components/avatar";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";

import { reviewEmployeeDocument } from "./_actions/review-employee-document";

type ApprovalDocument = {
	id: number;
	title: string | null;
	description: string | null;
	url: string;
	expiresAt: string | null;
	status: "pending" | "approved" | "rejected";
	approvedAt: string | null;
	rejectedAt: string | null;
	createdAt: Date | null;
	user: {
		id: number;
		name: string;
		email: string;
		avatarUrl: string | null;
	};
};

function badgeVariant(status: ApprovalDocument["status"]) {
	switch (status) {
		case "approved":
			return "success";
		case "rejected":
			return "destructive";
		default:
			return "outline";
	}
}

export function DocumentApprovalList({
	documents,
}: {
	documents: ApprovalDocument[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const review = (id: number, status: "approved" | "rejected") => {
		startTransition(async () => {
			await reviewEmployeeDocument(id, status);
			toast.success(
				status === "approved" ? "Document approved" : "Document rejected",
			);
			router.refresh();
		});
	};

	if (!documents.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Document Approvals</CardTitle>
					<CardDescription>
						No employee insurance documents are waiting for review.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Document Approvals</CardTitle>
				<CardDescription>
					Review uploaded employee insurance documents.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{documents.map((document) => (
					<div
						key={document.id}
						className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
					>
						<div className="flex min-w-0 items-start gap-3">
							<Avatar
								url={document.user.avatarUrl}
								name={document.user.name}
								email={document.user.email}
								className="h-10 w-10"
							/>
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium">{document.user.name}</p>
									<Badge variant={badgeVariant(document.status)}>
										{document.status}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground">
									{document.user.email}
								</p>
								<p className="text-sm">{document.title || "Insurance"}</p>
								{document.description && (
									<p className="text-sm text-muted-foreground">
										{document.description}
									</p>
								)}
								<div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
									<span>
										Uploaded:{" "}
										{document.createdAt
											? new Date(document.createdAt).toLocaleDateString()
											: "-"}
									</span>
									{document.expiresAt && (
										<span>
											Expires:{" "}
											{new Date(document.expiresAt).toLocaleDateString()}
										</span>
									)}
								</div>
								<a
									href={document.url}
									target="_blank"
									rel="noreferrer"
									className="text-sm text-primary hover:underline"
								>
									Open document
								</a>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant="outline"
								disabled={isPending || document.status === "approved"}
								onClick={() => review(document.id, "approved")}
							>
								Approve
							</Button>
							<Button
								variant="outline"
								disabled={isPending || document.status === "rejected"}
								onClick={() => review(document.id, "rejected")}
							>
								Reject
							</Button>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
