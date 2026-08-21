"use client";

import { Separator } from "@gnd/ui/separator";
import { useSaleOverview } from "../../context";
import { GeneralActionBar } from "../../general-action-bar";
import { GeneralFooter } from "../../general-footer";
import type { GeneralTabProps } from "../../general-tab";
import { CustomerSection } from "./customer-section";
import { FinancialRail } from "./financial-rail";
import { FulfillmentSignalSection } from "./fulfillment-signal-section";
import { GeneralTabV2Skeleton } from "./general-tab-v2-skeleton";
import { OperationsSection } from "./operations-section";
import { OrderSection } from "./order-section";
import type { SalesOverviewData } from "./types";
import { createGeneralTabV2ViewModel } from "./view-model";

export function GeneralTabV2({
	onCreatePayment,
	onEditAddress,
	onEditCustomer,
}: GeneralTabProps) {
	const { data } = useSaleOverview();
	if (!data) return <GeneralTabV2Skeleton />;
	const salesOverview = data as SalesOverviewData;

	const view = createGeneralTabV2ViewModel(salesOverview);

	return (
		<div className="relative flex flex-col">
			<div className="sticky top-0 z-10 border-b bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
				<GeneralActionBar
					salesNo={salesOverview.orderId}
					type={salesOverview.type}
					salesId={salesOverview.id}
				/>
			</div>

			<div className="grid min-w-0 grid-cols-1 items-stretch lg:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.92fr)]">
				<div className="flex min-w-0 flex-col gap-5 pb-5 pt-5 lg:border-r lg:pb-24 lg:pr-5">
					<CustomerSection
						data={salesOverview}
						onEditAddress={onEditAddress}
						onEditCustomer={onEditCustomer}
					/>
					<Separator />
					<OrderSection data={salesOverview} />
					{!view.isQuote ? (
						<>
							<Separator />
							<FulfillmentSignalSection data={salesOverview} />
							<Separator />
							<OperationsSection
								production={view.production}
								fulfillment={view.fulfillment}
							/>
						</>
					) : null}
				</div>
				<aside className="min-w-0 border-t bg-muted/20 pb-24 pt-5 lg:border-t-0 lg:px-5">
					<FinancialRail {...view} onCreatePayment={onCreatePayment} />
				</aside>
			</div>
			<GeneralFooter />
		</div>
	);
}
