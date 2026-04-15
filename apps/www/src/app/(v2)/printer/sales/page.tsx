import { cn } from "@/lib/utils";
import { IOrderPrintMode } from "@/types/sales";
import type { SalesPrintProps as BaseSalesPrintProps } from "@/utils/sales-print-utils";

import { getSalesPrintData } from "@/app-deps/(v2)/printer/sales/get-sales-print-data";
import PageShell from "@/components/page-shell";
import BasePrinter from "../base-printer";
// import { getSalesPrintData } from "./get-sales-print-data";
import { OrderBasePrinter } from "./order-base-printer";
import SalesPrintBlock from "./sales-print-block";

export interface SalesPrintProps {
	searchParams: BaseSalesPrintProps;
}
export default async function PrintOrderPage(props0) {
	const searchParams = await props0.searchParams;
	const slugs = searchParams.slugs?.split(",");
	const mode = searchParams.mode;
	if (mode === "order-packing") searchParams.mode = "order";
	const actions = slugs?.map((slug) => ({
		slug,
		action: getSalesPrintData(slug, searchParams),
	}));
	if (mode === "order-packing")
		slugs.map((slug) =>
			actions.push({
				slug,
				action: getSalesPrintData(slug, {
					...searchParams,
					mode: "packing list",
					dispatchId: searchParams.dispatchId,
				}),
			}),
		);
	const value = {
		// ...searchParams,
		preview: String(searchParams.preview) === "true",
		pdf: String(searchParams.pdf) === "true",
		slugs: slugs,
	};

	return (
		<PageShell>
			<BasePrinter {...value}>
				<OrderBasePrinter {...searchParams}>
					{actions?.map((props, index) => (
						<SalesPrintBlock
							className={cn(index > 0 && "break-before-page")}
							key={`${props.slug}-${index + 1}`}
							{...props}
						/>
					))}
				</OrderBasePrinter>
			</BasePrinter>
		</PageShell>
	);
}
