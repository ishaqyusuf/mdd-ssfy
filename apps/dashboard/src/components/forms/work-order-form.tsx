"use client";

import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { workOrderFormSchema } from "@api/db/queries/work-order";
import { Button } from "@gnd/ui/button";
import { DialogFooter } from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { labelValueOptions } from "@gnd/utils";
import { useMemo } from "react";
import type { Control } from "react-hook-form";
import type { z } from "zod";
import { FormCombobox } from "../common/controls/form-combobox";
import FormDate from "../common/controls/form-date";
import FormInput from "../common/controls/form-input";
import FormSelect from "../common/controls/form-select";
import { CustomModalPortal } from "../modals/custom-modal";
import { SubmitButton } from "../submit-button";

type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

export function WorkOrderForm({ data }: { data?: unknown }) {
	const form = useZodForm(workOrderFormSchema, {
		defaultValues: (data as Partial<WorkOrderFormData> | undefined) ?? {
			lot: "",
			block: "",
			status: "Pending",
			meta: { lotBlock: "" },
		},
	});

	const control = form.control as unknown as Control<WorkOrderFormData>;
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setParams } = useCustomerServiceParams();
	const { data: projectList } = useQuery(
		trpc.community.workOrder.projectsList.queryOptions(undefined, {
			staleTime: 5 * 60_000,
		}),
	);
	const projectName = form.watch("projectName");

	const project = useMemo(
		() => projectList?.find((item) => item?.title === projectName),
		[projectList, projectName],
	);
	const saveWorkOrder = useMutation(
		trpc.community.workOrder.saveWorkOrderForm.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getCustomerServices.infiniteQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getSummary.queryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getChart.queryKey(),
				});
				setParams(null);
				toast({ title: "Work order saved" });
			},
			onError(error) {
				toast({
					title: "Unable to save work order",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<Form {...form}>
			<div className="space-y-7 py-2 pb-6">
				<section
					className="space-y-4"
					aria-labelledby="work-order-location-heading"
				>
					<div className="border-b pb-2">
						<h3
							id="work-order-location-heading"
							className="text-sm font-semibold"
						>
							Location
						</h3>
						<p className="text-xs text-muted-foreground">
							Choose the project and unit where service is needed.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormCombobox
							control={control}
							name="projectName"
							label="Project"
							comboProps={{
								onSelect() {
									form.setValue("lot", "");
									form.setValue("block", "");
									form.setValue("meta.lotBlock", "");
								},
								items: projectList?.map((item) => ({
									label: item.title,
									id: item.title,
									disabled: !item.active,
								})),
							}}
						/>
						<FormCombobox
							control={control}
							name="meta.lotBlock"
							label="Unit"
							comboProps={{
								onSelect(item) {
									form.setValue("lot", item?.data?.lot);
									form.setValue("block", item?.data?.block);
									form.setValue("meta.lotBlock", item?.data?.lotBlock);
								},
								disabled: !project?.active,
								items: project?.homes?.map((item) => ({
									label: item.lotBlock,
									id: item.lotBlock,
									data: item,
								})),
							}}
						/>
						<div className="sm:col-span-2">
							<FormInput
								label="Home address"
								control={control}
								name="homeAddress"
							/>
						</div>
					</div>
				</section>

				<section
					className="space-y-4"
					aria-labelledby="work-order-contact-heading"
				>
					<div className="border-b pb-2">
						<h3
							id="work-order-contact-heading"
							className="text-sm font-semibold"
						>
							Customer and request
						</h3>
						<p className="text-xs text-muted-foreground">
							Add the person to contact and describe the issue.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormInput label="Homeowner" control={control} name="homeOwner" />
						<FormInput label="Phone" control={control} name="homePhone" />
						<FormInput label="Supervisor" control={control} name="supervisor" />
						<FormDate
							control={control}
							name="requestDate"
							label="Request date"
						/>
						<div className="sm:col-span-2">
							<FormInput
								label="Work description"
								control={control}
								name="description"
								type="textarea"
							/>
						</div>
					</div>
				</section>

				<section
					className="space-y-4"
					aria-labelledby="work-order-appointment-heading"
				>
					<div className="border-b pb-2">
						<h3
							id="work-order-appointment-heading"
							className="text-sm font-semibold"
						>
							Appointment and progress
						</h3>
						<p className="text-xs text-muted-foreground">
							Set a visit time and keep the work order status current.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormDate
							control={control}
							name="scheduleDate"
							label="Appointment date"
						/>
						<FormSelect
							control={control}
							name="scheduleTime"
							label="Time window"
							options={labelValueOptions(["8AM To 12PM", "1PM To 4PM"])}
						/>
						<FormSelect
							control={control}
							name="status"
							label="Status"
							options={labelValueOptions([
								"Pending",
								"Scheduled",
								"Incomplete",
								"Completed",
							])}
						/>
					</div>
				</section>
			</div>

			<CustomModalPortal>
				<form
					onSubmit={form.handleSubmit(
						(values) =>
							saveWorkOrder.mutate(values as unknown as WorkOrderFormData),
						() =>
							toast({
								title: "Check the work order",
								description:
									"Choose a project and unit, then review the required fields.",
								variant: "destructive",
							}),
					)}
				>
					<DialogFooter className="gap-2 border-t bg-background pt-3 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setParams(null)}
						>
							Cancel
						</Button>
						<SubmitButton isSubmitting={saveWorkOrder.isPending}>
							Save work order
						</SubmitButton>
					</DialogFooter>
				</form>
			</CustomModalPortal>
		</Form>
	);
}
