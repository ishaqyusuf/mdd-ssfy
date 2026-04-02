"use client";

import { FileViewer } from "@/components/file-viewer";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { ExternalLink, Eye, FileText, Upload } from "lucide-react";
import { useState } from "react";
import type { EmployeeRecord } from "../../types";

const statusVariants: Record<
	string,
	"default" | "destructive" | "secondary" | "outline"
> = {
	approved: "default",
	rejected: "destructive",
	pending: "outline",
};

interface Props {
	records: EmployeeRecord[];
	onUpload?: () => void;
}

function inferMimeType(url: string) {
	const normalized = url.toLowerCase();
	if (normalized.endsWith(".pdf")) return "application/pdf";
	if (normalized.endsWith(".png")) return "image/png";
	if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
		return "image/jpeg";
	}
	if (normalized.endsWith(".webp")) return "image/webp";
	if (normalized.endsWith(".gif")) return "image/gif";
	return null;
}

export function EmployeeRecordsTab({ records, onUpload }: Props) {
	const [selectedRecord, setSelectedRecord] = useState<EmployeeRecord | null>(
		null,
	);
	const previewUrl = selectedRecord?.document?.url ?? null;
	const previewMimeType = previewUrl ? inferMimeType(previewUrl) : null;

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-sm font-medium">
						Documents & Records
					</CardTitle>
					{onUpload && (
						<Button
							size="sm"
							variant="outline"
							onClick={onUpload}
							className="flex items-center gap-1"
						>
							<Upload className="h-3 w-3" />
							Upload
						</Button>
					)}
				</CardHeader>
				<CardContent>
					{records.length === 0 ? (
						<p className="text-sm text-muted-foreground">No records on file.</p>
					) : (
						<div className="divide-y">
							{records.map((record) => (
								<div
									key={record.id}
									className="flex items-center gap-3 py-3 text-sm"
								>
									<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="flex flex-1 flex-col gap-0.5">
										<span className="font-medium">{record.title}</span>
										<span className="text-xs capitalize text-muted-foreground">
											{record.type.replace("-", " ")}
											{record.expiresAt && ` · Expires ${record.expiresAt}`}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Badge
											variant={statusVariants[record.status]}
											className="capitalize"
										>
											{record.status}
										</Badge>
										{record.document?.url ? (
											<Button
												size="sm"
												variant="ghost"
												onClick={() => setSelectedRecord(record)}
											>
												<Eye className="mr-2 h-4 w-4" />
												Preview
											</Button>
										) : null}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={Boolean(selectedRecord)}
				onOpenChange={(opened) => {
					if (!opened) setSelectedRecord(null);
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
					<div className="flex h-[85vh] flex-col">
						<DialogHeader className="px-6 py-5">
							<DialogTitle>
								{selectedRecord?.title ?? "Document Preview"}
							</DialogTitle>
							<DialogDescription>
								Preview the uploaded employee document.
							</DialogDescription>
						</DialogHeader>

						<div className="flex items-center justify-between border-y px-6 py-4">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{selectedRecord?.document?.filename || selectedRecord?.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{(selectedRecord?.type ?? "document").replace("-", " ")}
									{selectedRecord?.expiresAt
										? ` · Expires ${selectedRecord.expiresAt}`
										: ""}
								</p>
							</div>
							{previewUrl ? (
								<Button variant="outline" asChild>
									<a href={previewUrl} target="_blank" rel="noreferrer">
										<ExternalLink className="mr-2 h-4 w-4" />
										Open Document
									</a>
								</Button>
							) : null}
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-6">
							<div className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-xl border bg-background">
								{previewUrl && previewMimeType ? (
									<FileViewer
										url={previewUrl}
										mimeType={previewMimeType}
										maxWidth={820}
									/>
								) : previewUrl ? (
									<a
										href={previewUrl}
										target="_blank"
										rel="noreferrer"
										className="text-sm text-primary underline"
									>
										Open uploaded document
									</a>
								) : (
									<p className="text-sm text-muted-foreground">
										Document preview unavailable
									</p>
								)}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
