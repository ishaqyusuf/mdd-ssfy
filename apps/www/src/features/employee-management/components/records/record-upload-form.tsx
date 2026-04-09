"use client";

import { Icons } from "@gnd/ui/icons";

import { useZodForm } from "@/hooks/use-zod-form";
import { uploadFile } from "@/lib/upload-file";
import { useTRPC } from "@/trpc/client";
import { useTransition } from "@/utils/use-safe-transistion";
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
	url: z.string().min(1, "Document URL is required"),
	description: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
});

export function RecordUploadForm({ open, employeeId, onClose }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, startUpload] = useTransition();
	const [type, setType] = useState<EmployeeRecord["type"]>("insurance");
	const [fileName, setFileName] = useState("");
	const form = useZodForm(documentSchema, {
		defaultValues: {
			title: defaultTitles.insurance,
			url: "",
			description: "",
			expiresAt: "",
		},
	});

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
		setFileName("");
		form.reset({
			title: defaultTitles.insurance,
			url: "",
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
		startUpload(async () => {
			const formData = new FormData();
			formData.append("file", file);
			const data = await uploadFile(formData, "contractor-document");
			if (data?.error) {
				toast.error(data.error.message ?? "Unable to upload employee document");
				return;
			}

			form.setValue("url", data.secure_url ?? data.public_id ?? "", {
				shouldValidate: true,
			});
			setFileName(file.name);
			if (!form.getValues("title").trim()) {
				form.setValue("title", file.name.replace(/\.[^.]+$/, ""), {
					shouldValidate: true,
				});
			}
		});
	}

	const onSubmit = form.handleSubmit((values) => {
		const normalizedTitle =
			type === "insurance" ? defaultTitles.insurance : values.title.trim();

		saveDocument.mutate({
			...values,
			userId: employeeId,
			title: normalizedTitle,
			description: values.description?.trim()
				? values.description.trim()
				: type === "insurance"
					? "Uploaded by admin from employee overview."
					: type,
			expiresAt: values.expiresAt || undefined,
		});
	});

	const title = form.watch("title");
	const url = form.watch("url");

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
								{url ? <Badge variant="secondary">Uploaded</Badge> : null}
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="*/*"
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
								disabled={
									!title.trim() || !url || isUploading || saveDocument.isPending
								}
							>
								{saveDocument.isPending ? "Saving..." : "Upload"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
