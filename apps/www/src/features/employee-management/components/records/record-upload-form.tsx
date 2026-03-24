"use client";

import { uploadFile } from "@/lib/upload-file";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { EmployeeRecord } from "../../types";

interface Props {
	open: boolean;
	employeeId: number;
	onClose: () => void;
}

const recordTypes: { value: EmployeeRecord["type"]; label: string }[] = [
	{ value: "insurance", label: "Insurance" },
	{ value: "background-check", label: "Background Check" },
	{ value: "certification", label: "Certification" },
	{ value: "id", label: "ID" },
	{ value: "other", label: "Other" },
];

const defaultTitles: Record<EmployeeRecord["type"], string> = {
	insurance: "Insurance",
	"background-check": "Background Check",
	certification: "Certification",
	id: "ID",
	other: "",
};

export function RecordUploadForm({ open, employeeId, onClose }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, startUpload] = useTransition();
	const [type, setType] = useState<EmployeeRecord["type"]>("insurance");
	const [title, setTitle] = useState(defaultTitles.insurance);
	const [expiresAt, setExpiresAt] = useState("");
	const [url, setUrl] = useState("");
	const [fileName, setFileName] = useState("");

	const saveDocument = useMutation(
		trpc.user.saveDocument.mutationOptions({
			onSuccess() {
				toast.success("Employee document uploaded");
				resetForm();
				queryClient.invalidateQueries({
					queryKey: trpc.hrm.getEmployeeOverview.queryKey({ id: employeeId }),
				});
				onClose();
			},
			onError(error) {
				toast.error(error.message || "Failed to upload employee document");
			},
		}),
	);

	function resetForm() {
		setType("insurance");
		setTitle(defaultTitles.insurance);
		setExpiresAt("");
		setUrl("");
		setFileName("");
	}

	function handleDialogChange(nextOpen: boolean) {
		if (!nextOpen) {
			resetForm();
			onClose();
		}
	}

	function handleFileSelect(file: File) {
		startUpload(async () => {
			const formData = new FormData();
			formData.append("file", file);
			const data = await uploadFile(formData, "contractor-document");

			if (data?.error) {
				toast.error(data.error.message || "Unable to upload file");
				return;
			}

			setUrl(data.secure_url ?? data.public_id ?? "");
			setFileName(file.name);
			if (!title.trim()) {
				setTitle(file.name.replace(/\.[^.]+$/, ""));
			}
		});
	}

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const normalizedTitle =
			type === "insurance" ? defaultTitles.insurance : title.trim();

		saveDocument.mutate({
			userId: employeeId,
			title: normalizedTitle,
			url,
			expiresAt: expiresAt || undefined,
			description:
				type === "insurance"
					? "Uploaded by admin from employee overview."
					: type,
		});
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload Employee Document</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label>Type</Label>
						<Select
							value={type}
							onValueChange={(value) => {
								const nextType = value as EmployeeRecord["type"];
								setType(nextType);
								if (!title.trim() || title === defaultTitles[type]) {
									setTitle(defaultTitles[nextType]);
								}
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{recordTypes.map((recordType) => (
									<SelectItem key={recordType.value} value={recordType.value}>
										{recordType.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Document</Label>
						<button
							type="button"
							className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-left"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
							<div className="flex flex-1 flex-col gap-1">
								<span className="text-sm font-medium">
									{isUploading ? "Uploading..." : "Choose a file"}
								</span>
								<span className="text-xs text-muted-foreground">
									{fileName || "PDF, image, or any supporting document"}
								</span>
							</div>
							{url ? <Badge variant="secondary">Uploaded</Badge> : null}
						</button>
						<input
							ref={fileInputRef}
							type="file"
							className="sr-only"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) handleFileSelect(file);
							}}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Title</Label>
						<Input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="e.g. Liability Insurance 2026"
							required
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Expiry Date (optional)</Label>
						<Input
							type="date"
							value={expiresAt}
							onChange={(event) => setExpiresAt(event.target.value)}
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleDialogChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								!title.trim() || !url || isUploading || saveDocument.isPending
							}
						>
							{saveDocument.isPending ? "Saving..." : "Upload"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
