"use client";

import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { CustomModal } from "./custom-modal";

const WorkOrderForm = dynamic(
	() =>
		import("../forms/work-order-form").then((module) => module.WorkOrderForm),
	{ loading: () => <WorkOrderFormLoading /> },
);

function WorkOrderFormLoading() {
	return (
		<div className="space-y-6 py-4" aria-label="Loading work order form">
			{[0, 1, 2].map((section) => (
				<div key={section} className="space-y-3">
					<Skeleton className="h-5 w-36" />
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
					</div>
				</div>
			))}
		</div>
	);
}

export function WorkOrderFormModal() {
	const { openCustomerServiceId, setParams } = useCustomerServiceParams();
	const isOpen = !!openCustomerServiceId;
	const isEditing = (openCustomerServiceId ?? 0) > 0;
	const trpc = useTRPC();
	const { data, isPending, isError } = useQuery(
		trpc.community.workOrder.form.queryOptions(openCustomerServiceId, {
			enabled: isEditing,
			staleTime: 60_000,
		}),
	);

	return (
		<CustomModal
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) setParams(null);
			}}
			title={isEditing ? "Edit work order" : "New work order"}
			description="Keep the location, customer, and appointment details together."
			size="2xl"
			className="fixed inset-0 left-0 top-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 sm:max-w-none md:inset-auto md:left-[50%] md:top-[50%] md:h-[90vh] md:w-full md:max-w-2xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl md:border"
		>
			{isOpen ? (
				<CustomModal.Content className="relative -mx-4 max-h-none min-h-0 flex-1 px-4 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!w-full md:max-h-none">
					{isEditing && isPending ? <WorkOrderFormLoading /> : null}
					{isEditing && isError ? (
						<p className="py-8 text-sm text-destructive">
							Unable to load this work order. Close and try again.
						</p>
					) : null}
					{(!isEditing || data) && !isError ? (
						<WorkOrderForm key={openCustomerServiceId} data={data} />
					) : null}
				</CustomModal.Content>
			) : null}
		</CustomModal>
	);
}
