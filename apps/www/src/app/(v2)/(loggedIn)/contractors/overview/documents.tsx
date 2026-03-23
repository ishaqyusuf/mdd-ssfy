"use client";

import { _deleteContractorDoc } from "@/app-deps/(v2)/(loggedIn)/contractors/overview/_actions/delete-contractor-doc";
import { reviewContractorDocument } from "@/app-deps/(v2)/(loggedIn)/contractors/overview/_actions/review-contractor-doc";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { openModal } from "@/lib/modal";
import type { IUserDoc } from "@/types/hrm";
import { isInsuranceDocumentTitle } from "@gnd/utils/insurance-documents";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import type { ContractorOverview } from "./type";

interface Props {
	contractor: ContractorOverview;
	className?: string;
}
export default function ContractorDocuments({ contractor, ...props }: Props) {
	const router = useRouter();

	async function deleteImg(img: IUserDoc) {
		await _deleteContractorDoc(img);
		router.refresh();
	}

	async function reviewDocument(id: number, status: "approved" | "rejected") {
		await reviewContractorDocument(id, status);
		toast.success(
			status === "approved"
				? "Insurance document approved"
				: "Insurance document rejected",
		);
		router.refresh();
	}
	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>
					<span>Documents</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Button onClick={() => openModal("uploadDoc", contractor)}>
					Upload
				</Button>
				<Table>
					<TableBody>
						{contractor.user.documents?.map((doc) => (
							<TableRow key={doc.id}>
								<TableCell>
									<Image
										className="cursor-pointer rounded border-2"
										onClick={() =>
											openModal("img", {
												src: doc.meta.url || doc.url,
											})
										}
										width={70}
										height={50}
										src={doc.meta.url || doc.url}
										alt={doc.description || doc.title || "Document"}
									/>
								</TableCell>
								<TableCell>
									<div className="space-y-2">
										<div className="space-y-1">
											<p className="font-medium">{doc.title || "Document"}</p>
											{doc.description && <p>{doc.description}</p>}
											{doc.meta.expiresAt && (
												<p className="text-sm text-muted-foreground">
													Expires:{" "}
													{new Date(doc.meta.expiresAt).toLocaleDateString()}
												</p>
											)}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant={
													doc.meta.status === "approved"
														? "success"
														: doc.meta.status === "rejected"
															? "destructive"
															: "outline"
												}
											>
												{doc.meta.status || "pending"}
											</Badge>
											{isInsuranceDocumentTitle(doc.title) &&
												doc.meta.status !== "approved" && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => reviewDocument(doc.id, "approved")}
													>
														Approve
													</Button>
												)}
											{isInsuranceDocumentTitle(doc.title) &&
												doc.meta.status !== "rejected" && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => reviewDocument(doc.id, "rejected")}
													>
														Reject
													</Button>
												)}
											<ConfirmBtn onClick={() => deleteImg(doc)}>
												Delete
											</ConfirmBtn>
										</div>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
