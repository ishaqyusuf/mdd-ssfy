"use client";

import { Icons } from "@gnd/ui/icons";

import { useZodForm } from "@/hooks/use-zod-form";
import {
	readEmployeeDocumentAsBase64,
	resolveEmployeeDocumentMimeType,
	validateEmployeeDocumentFile,
} from "@/lib/employee-document-upload";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
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
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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

const documentSchema = z.object({
	title: z.string().min(1, "Document title is required"),
	description: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
});

export function RecordUploadForm({ open, employeeId, onClose }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isPreparing, setIsPreparing] = useState(false);
	const [type, setType] = useState<EmployeeRecord["type"]>("insurance");
	const [fileName, setFileName] = useState("");
	const form = useZodForm(documentSchema, {
		defaultValues: {
			title: defaultTitles.insurance,
			description: "",
			expiresAt: "",
		},
	});

	const uploadDocument = useMutation(
		trpc.user.uploadDocumentAsset.mutationOptions({
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
		setFileName("");
		setSelectedFile(null);
		form.reset({
			title: defaultTitles.insurance,
			description: "",
			expiresAt: "",
		});
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	function handleDialogChange(nextOpen: boolean) {
		if (!nextOpen) {
			resetForm();
			onClose();
		}
	}

	function handleFileSelect(file: File) {
		const validationError = validateEmployeeDocumentFile(file);
		if (validationError) {
			toast.error(validationError);
			return;
		}
		setSelectedFile(file);
		setFileName(file.name);
		if (!form.getValues("title").trim()) {
			form.setValue("title", file.name.replace(/\.[^.]+$/, ""), {
				shouldValidate: true,
			});
		}
	}

	const onSubmit = form.handleSubmit(async (values) => {
		if (!selectedFile) {
			toast.error("Choose a document file first.");
			return;
		}
		const contentType = resolveEmployeeDocumentMimeType(selectedFile);
		if (!contentType) {
			toast.error("The selected document type is unsupported.");
			return;
		}
		const normalizedTitle =
			type === "insurance" ? defaultTitles.insurance : values.title.trim();
		setIsPreparing(true);
		try {
			await uploadDocument.mutateAsync({
				userId: employeeId,
				filename: selectedFile.name,
				contentType,
				content: await readEmployeeDocumentAsBase64(selectedFile),
				title: normalizedTitle,
				description: values.description?.trim()
					? values.description.trim()
					: type === "insurance"
						? "Uploaded by admin from employee overview."
						: type,
				expiresAt: values.expiresAt || undefined,
			});
		} catch {
			// The mutation reports a sanitized error through its onError handler.
		} finally {
			setIsPreparing(false);
		}
	});

	const title = form.watch("title");
	const isUploading = uploadDocument.isPending || isPreparing;

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload Employee Document</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label>Type</Label>
							<Select
								value={type}
								onValueChange={(value) => {
									const nextType = value as EmployeeRecord["type"];
									setType(nextType);
									if (!title.trim() || title === defaultTitles[type]) {
										form.setValue("title", defaultTitles[nextType], {
											shouldValidate: true,
										});
									}
									if (nextType === "insurance") {
										form.setValue(
											"description",
											"Uploaded by admin from employee overview.",
										);
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
								<Icons.Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
								<div className="flex flex-1 flex-col gap-1">
									<span className="text-sm font-medium">
										{isUploading ? "Uploading..." : "Choose a file"}
									</span>
									<span className="text-xs text-muted-foreground">
										{fileName || "PDF, image, or any supporting document"}
									</span>
								</div>
								{selectedFile ? (
									<Badge variant="secondary">Selected</Badge>
								) : null}
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".pdf,.png,.jpg,.jpeg,.webp,.avif,.heic,.heif,application/pdf,image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif"
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
								{...form.register("title")}
								placeholder="e.g. Liability Insurance 2026"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label>Expiry Date (optional)</Label>
							<Input type="date" {...form.register("expiresAt")} />
						</div>

						<div className="flex flex-col gap-1.5">
							<Label>Description (optional)</Label>
							<Input
								{...form.register("description")}
								placeholder="Brief description of the document"
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
								disabled={!title.trim() || !selectedFile || isUploading}
							>
								{isUploading ? "Uploading..." : "Upload"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
