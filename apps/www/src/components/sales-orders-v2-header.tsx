"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useSortParams } from "@/hooks/use-sort-params";
import { cn } from "@/lib/utils";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { Checkbox } from "@gnd/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { CreateSalesBtn } from "./create-sales-btn";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { SalesOrdersV2ColumnVisibility } from "./sales-orders-v2-column-visibility";
import { SalesOrdersV2Export } from "./sales-orders-v2-export";
import { SalesTabs } from "./sales-tabs";

export function SalesOrdersV2Header() {
	return (
		<div className="flex flex-col gap-4 xl:flex-row xl:items-center">
			<div className="min-w-0 flex-1">
				<SearchFilterProvider
					args={[
						{
							filterSchema: salesOrdersV2FilterParams,
						},
					]}
				>
					<SalesOrdersV2SearchFilterContent />
				</SearchFilterProvider>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<SalesOrdersV2ColumnVisibility />
				<SalesOrdersV2Export />
				<CreateSalesBtn />
			</div>
		</div>
	);
}

const paymentReviewActionLabels = {
	production: "Productions",
	fulfillment: "Fulfillment",
	inbound: "Inbound",
} as const;

type PaymentReviewAction = keyof typeof paymentReviewActionLabels;

export function SalesOrdersPaymentReviewSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params } = useSortParams();
	const [sortColumn] = params.sort?.[0]?.split(".") ?? [];
	const isPaymentReviewQueueActive = sortColumn === "latestPaymentAt";
	const settingsQuery = useQuery({
		...trpc.sales.getPaymentReviewSettings.queryOptions(),
		enabled: isPaymentReviewQueueActive,
	});
	const updateSettings = useMutation(
		trpc.sales.updatePaymentReviewSettings.mutationOptions({
			async onSuccess() {
				toast({
					duration: 2000,
					variant: "success",
					title: "Settings updated",
					description: "Payment review automation was updated.",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getPaymentReviewSettings.queryKey(),
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					title: "Settings not updated",
					description:
						error.message || "Unable to update payment review settings.",
				});
			},
		}),
	);

	if (!isPaymentReviewQueueActive || !settingsQuery.data?.canManage) {
		return null;
	}

	const current = {
		production: false,
		fulfillment: false,
		inbound: false,
		...settingsQuery.data.settings.autoReviewActions,
	};
	const setAction = (action: PaymentReviewAction, checked: boolean) => {
		updateSettings.mutate({
			autoReviewActions: {
				...current,
				[action]: checked,
			},
		});
	};

	return (
		<div className="rounded-md border bg-muted/20 px-4 py-3">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold">Payment Review Settings.</p>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Select which actions should automatically mark order payment as
						reviewed. Selecting none on the list means you will manually review
						each order.
					</p>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
					{Object.entries(paymentReviewActionLabels).map(([action, label]) => (
						<div key={action} className="flex items-center gap-2 text-sm">
							<Checkbox
								id={`payment-review-action-${action}`}
								checked={current[action as PaymentReviewAction]}
								disabled={updateSettings.isPending}
								onCheckedChange={(value) => {
									setAction(action as PaymentReviewAction, value === true);
								}}
							/>
							<label
								htmlFor={`payment-review-action-${action}`}
								className="cursor-pointer"
							>
								{label}
							</label>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function SalesOrdersV2SearchFilterContent() {
	const auth = useAuth();
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const isTableScrolled = useSalesOrdersStore((state) => state.isTableScrolled);
	const { data: trpcFilterData, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.salesOrders.queryOptions({
			salesManager: auth?.can?.viewSalesManager,
		}),
	});

	return (
		<SearchFilterTRPC
			placeholder="Search order number, customer, phone, address, or P.O..."
			filterList={trpcFilterData}
			loading={shouldFetch && isFetching}
			afterSearch={<SalesOrdersV2InlineTabs visible={isTableScrolled} />}
		/>
	);
}

function SalesOrdersV2InlineTabs({ visible }: { visible: boolean }) {
	return (
		<div
			aria-hidden={!visible}
			className={cn(
				"min-w-0 flex-1 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out lg:flex-none",
				visible
					? "max-w-full translate-y-0 opacity-100 lg:max-w-[520px]"
					: "pointer-events-none max-w-0 -translate-y-1 opacity-0",
			)}
		>
			<SalesTabs portal={false} compact />
		</div>
	);
}
