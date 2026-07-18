"use client";

import { DocumentApprovalsColumnVisibility } from "@/components/tables-2/document-approvals/column-visibility";
import type { ApprovalDocument } from "@/components/tables-2/document-approvals/columns";
import { DataTable as DocumentApprovalsDataTable } from "@/components/tables-2/document-approvals/data-table";
import { useDocumentReviewParams } from "@/hooks/use-document-review-params";
import type { TableSettings } from "@/utils/table-settings";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";

import { reviewEmployeeDocument } from "./_actions/review-employee-document";

export function DocumentApprovalList({
	documents,
	initialSettings,
}: {
	documents: ApprovalDocument[];
	initialSettings?: Partial<TableSettings>;
}) {
	const router = useRouter();
	const { setParams } = useDocumentReviewParams();
	const [isPending, startTransition] = useTransition();

	const review = (
		document: ApprovalDocument,
		status: "approved" | "rejected",
	) => {
		startTransition(async () => {
			await reviewEmployeeDocument(document.id, status);
			toast.success(
				status === "approved" ? "Document approved" : "Document rejected",
			);
			router.refresh();
		});
	};

	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-1">
					<CardTitle>Document Approvals</CardTitle>
					<CardDescription>
						Review uploaded employee insurance documents.
					</CardDescription>
				</div>
				<DocumentApprovalsColumnVisibility />
			</CardHeader>
			<CardContent className="p-0">
				<DocumentApprovalsDataTable
					data={documents}
					initialSettings={initialSettings}
					isReviewPending={isPending}
					onOpenReview={(document) => {
						void setParams({ openDocumentReviewId: document.id });
					}}
					onReview={review}
				/>
			</CardContent>
		</Card>
	);
}
