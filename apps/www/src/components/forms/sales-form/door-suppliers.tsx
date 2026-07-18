import { StepHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { DoorSuppliersColumnVisibility } from "@/components/tables-2/door-suppliers/column-visibility";
import type { DoorSupplierRow } from "@/components/tables-2/door-suppliers/columns";
import { DataTable as DoorSuppliersDataTable } from "@/components/tables-2/door-suppliers/data-table";
import { useTRPC } from "@/trpc/client";
import type { saveSupplierSchema } from "@api/schemas/sales-form";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";
import { Suspense, useState } from "react";
import type { z } from "zod";
import { DoorSupplierForm } from "./door-supplier-form";

type DoorSuppliersProps = {
	itemStepUid: string;
};

type SupplierFormData = Partial<z.infer<typeof saveSupplierSchema>>;

export function DoorSuppliers({ itemStepUid }: DoorSuppliersProps) {
	return (
		<Suspense fallback={<LoadingSkeleton />}>
			<Content itemStepUid={itemStepUid} />
		</Suspense>
	);
}
function Content({ itemStepUid }: DoorSuppliersProps) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.sales.getSuppliers.queryOptions({}));
	const [supplierFormData, setSupplierFormData] =
		useState<SupplierFormData | null>(null);

	const qc = useQueryClient();
	// const ctx = useStepContext(itemStepUid);
	// ctx.tabComponents.

	const stepClass = new StepHelperClass(itemStepUid);
	const door = stepClass.getDoorStepForm2();
	const { mutate: deleteSupplier, isPending: isDeletingSupplier } = useMutation(
		trpc.sales.deleteSupplier.mutationOptions({
			onSuccess(data, variables, context) {
				qc.invalidateQueries({
					queryKey: trpc.sales.getSuppliers.queryKey({}),
				});
			},
		}),
	);
	if (!data?.uid && !supplierFormData)
		return (
			<EmptyState
				className="py-10"
				label="supplier"
				onCreate={(e) => {
					setSupplierFormData({});
				}}
			/>
		);
	const meta = door?.form?.formStepMeta;
	const suppliers = (data?.stepProducts ?? []) as DoorSupplierRow[];
	return (
		<div className="min-h-[40vh]">
			<div className="p-4 space-y-4">
				{!supplierFormData ? (
					<div className="flex items-center">
						<div className="">
							{meta?.supplierUid ? (
								<div className="flex flex-wrap items-center gap-2">
									<Label>
										{meta?.supplierName}{" "}
										{
											" Supplier Selected. Door pricing will now show selected supplier pricings."
										}
									</Label>
									<Button
										onClick={(e) => {
											stepClass.setDoorSupplier(door.itemStepUid);
										}}
										variant="link"
										size="sm"
									>
										Reset to default
									</Button>
								</div>
							) : (
								<Label>Click to select a supplier</Label>
							)}
						</div>
						<div className="flex-1" />
						<DoorSuppliersColumnVisibility />
						<Button
							size="sm"
							onClick={(e) => {
								setSupplierFormData({});
							}}
						>
							<Icons.Add className="size-4" />
							<span>Add</span>
						</Button>
					</div>
				) : (
					<div className="p-4">
						<DoorSupplierForm
							onCreate={(e) => {
								setSupplierFormData(null);
								qc.invalidateQueries({
									queryKey: trpc.sales.getSuppliers.queryKey({}),
								});
							}}
							onCancel={(e) => setSupplierFormData(null)}
							defaultValues={supplierFormData}
						/>
					</div>
				)}
				<DoorSuppliersDataTable
					data={suppliers}
					selectedSupplierUid={meta?.supplierUid}
					isDeleting={isDeletingSupplier}
					onSelect={(supplier) => {
						stepClass.setDoorSupplier(door.itemStepUid, {
							uid: supplier.uid,
							name: supplier.name,
						});
					}}
					onEdit={(supplier) => {
						setSupplierFormData({
							id: supplier.id,
							name: supplier.name,
						});
					}}
					onDelete={(supplier) => {
						if (meta?.supplierUid === supplier.uid) {
							stepClass.setDoorSupplier(door.itemStepUid);
						}
						deleteSupplier({
							id: supplier.id,
						});
					}}
				/>
			</div>
			{/* )} */}
		</div>
	);
}
function LoadingSkeleton() {
	return (
		<div className="flex m-10 flex-col">
			<Skeletons.Dashboard />
		</div>
	);
}
