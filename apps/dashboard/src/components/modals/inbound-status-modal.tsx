import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { orderInboundStatuses } from "@gnd/utils/constants";
import { useEffect, useMemo, useRef } from "react";
import { FormProvider, useFieldArray } from "react-hook-form";
import type { z } from "zod";
import FormInput from "../common/controls/form-input";
import FormSelect from "../common/controls/form-select";
import { SubmitButton } from "../submit-button";

import { env } from "@/env.mjs";
import { toast } from "@gnd/ui/use-toast";
import Image from "next/image";
import ConfirmBtn from "../confirm-button";
import { InboundDocumentUploadZone } from "../sales-inbound/inbound-document-upload-zone";
import { buildInboundDemandDisplayById } from "./inbound-demand-display";
import { InboundDemandSelection } from "./inbound-demand-selection";
import { getPromptMutableDemandIds } from "./inbound-demand-selection-state";
import { invalidateInboundStatusQueries } from "./inbound-status-invalidation";

// get schema from zod input
const formSchema = saveInboundNoteSchema;

export function InboundSalesModal() {
	const { params, setParams } = useInboundStatusModal();
	const form = useZodForm(formSchema, {
		defaultValues: {
			salesId: null,
			orderNo: "",
			note: "",
			noteColor: "",
			demandIds: [],
			attachments: [],
		},
	});
	const attachments = useFieldArray({
		control: form.control,
		name: "attachments",
		keyName: "_id",
	});
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const demandRowsQuery = useQuery(
		trpc.inventories.inboundDemandQueue.queryOptions(
			{
				saleId: params.inboundOrderId ?? 0,
				status: ["pending", "ordered", "partially_received"],
			},
			{
				enabled: !!params.inboundOrderId && !!params.updateInboundStatus,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const salesInventoryOverviewQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions(
			{
				salesOrderId: params.inboundOrderId ?? 0,
			},
			{
				enabled: !!params.inboundOrderId && !!params.updateInboundStatus,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const demandRows = demandRowsQuery.data ?? [];
	const demandDisplayById = useMemo(
		() => buildInboundDemandDisplayById(salesInventoryOverviewQuery.data?.rows),
		[salesInventoryOverviewQuery.data?.rows],
	);
	const selectedStatus = form.watch("status");
	const selectedDemandIds = form.watch("demandIds") ?? [];
	const mutableDemandIds = useMemo(
		() => getPromptMutableDemandIds(demandRows, selectedStatus),
		[demandRows, selectedStatus],
	);
	const autoSelectedContextRef = useRef<string | null>(null);
	const saveInboundStatus = useMutation(
		trpc.notes.saveInboundNote.mutationOptions({
			onSuccess: () => {
				invalidateInboundStatusQueries(queryClient, trpc);
				toast({
					title: "Inbound status updated.",
					variant: "success",
				});
				setParams(null);
			},
			onError(error) {
				toast({
					title: "Unable to update inbound status",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const deleteUpload = useMutation(trpc.storage.delete.mutationOptions());
	const statusList = [...orderInboundStatuses];
	const resetForm = form.reset;
	useEffect(() => {
		if (params.inboundOrderId) {
			autoSelectedContextRef.current = null;
			resetForm({
				salesId: params.inboundOrderId,
				orderNo: params.inboundOrderNo,
				status: orderInboundStatuses.find(
					(status) => status === params.inboundOrderStatus,
				),
				note: "",
				demandIds: [],
			});
		}
	}, [params, resetForm]);
	useEffect(() => {
		if (
			!params.inboundOrderId ||
			!params.updateInboundStatus ||
			!selectedStatus ||
			!demandRowsQuery.isSuccess ||
			demandRowsQuery.isFetching
		) {
			return;
		}

		const selectionContext = `${params.inboundOrderId}:${selectedStatus}`;
		if (autoSelectedContextRef.current !== selectionContext) {
			autoSelectedContextRef.current = selectionContext;
			form.setValue("demandIds", mutableDemandIds, {
				shouldDirty: false,
			});
			return;
		}

		const nextDemandIds = selectedDemandIds.filter((demandId) =>
			mutableDemandIds.includes(demandId),
		);

		if (nextDemandIds.length === selectedDemandIds.length) return;

		form.setValue("demandIds", nextDemandIds, {
			shouldDirty: true,
		});
	}, [
		demandRowsQuery.isFetching,
		demandRowsQuery.isSuccess,
		form,
		mutableDemandIds,
		params.inboundOrderId,
		params.updateInboundStatus,
		selectedDemandIds,
		selectedStatus,
	]);
	if (!params.inboundOrderId) return null;
	function onSubmit(values: z.infer<typeof formSchema>) {
		saveInboundStatus.mutate({
			...values,
		});
	}
	function toggleDemandSelection(demandId: number, checked: boolean) {
		const nextDemandIds = checked
			? Array.from(new Set([...selectedDemandIds, demandId]))
			: selectedDemandIds.filter((id) => id !== demandId);

		form.setValue("demandIds", nextDemandIds, {
			shouldDirty: true,
		});
	}
	function markAllDemands() {
		form.setValue("demandIds", mutableDemandIds, {
			shouldDirty: true,
		});
	}
	return (
		<Dialog
			open={!!params.inboundOrderId && params.updateInboundStatus}
			onOpenChange={() =>
				setParams({
					updateInboundStatus: null,
				})
			}
		>
			<DialogContent className="min-w-max   flex flex-col max-w-2xl">
				<DialogHeader>
					<DialogTitle>Update Order Inbound</DialogTitle>
					<DialogDescription>
						Update the inbound status for Order #{params.inboundOrderNo}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="flex-1 relative overflow-auto">
					<FormProvider {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<div className="">
								<FormSelect
									control={form.control}
									options={statusList}
									label="Status"
									name="status"
								/>
								<FormInput
									control={form.control}
									name="note"
									label="Note"
									type="textarea"
									placeholder="Add Note about the inbound status"
								/>
							</div>
							<InboundDemandSelection
								rows={demandRows}
								selectedStatus={selectedStatus}
								selectedDemandIds={selectedDemandIds}
								displayByDemandId={demandDisplayById}
								onSelectionChange={toggleDemandSelection}
								onMarkAll={markAllDemands}
							/>
							<div className="flex gap-4">
								{attachments.fields.map((a, ai) => (
									<div key={a._id}>
										<Image
											src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${a.pathname}`}
											alt={a.pathname}
											width={75}
											height={75}
										/>
										<div className="flex gap-4">
											<ConfirmBtn
												trash
												onClick={(e) => {
													deleteUpload
														.mutateAsync({
															pathname: a.pathname,
														})
														.then(() => {
															attachments.remove(ai);
														})
														.catch((e) => {});
												}}
												type="button"
											/>
										</div>
									</div>
								))}
								<InboundDocumentUploadZone
									onUploadComplete={(e) => {
										e.map((a) => {
											attachments.append({
												pathname: a.pathname,
											});
										});
									}}
								>
									<Button
										type="button"
										onClick={() =>
											document.getElementById("upload-files")?.click()
										}
									>
										Upload
									</Button>
								</InboundDocumentUploadZone>
							</div>
							<DialogFooter className="flex justify-end gap-4">
								{/* <Button
                                    variant="secondary"
                                    // action={updateAccount}
                                >
                                    Cancel
                                </Button> */}
								<SubmitButton
									type="submit"
									isSubmitting={saveInboundStatus.isPending}
									// action={updateAccount}
								>
									Update Status
								</SubmitButton>
							</DialogFooter>
						</form>
					</FormProvider>

					{/* <div className="pt-[150px]">
                        <SalesPreview />
                    </div> */}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
