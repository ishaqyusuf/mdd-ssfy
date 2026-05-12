"use client";

import { Env } from "@/components/env";
import { SalesMenu } from "@/components/sales-menu";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { Icons } from "@gnd/ui/icons";
import type { SalesType } from "@sales/types";

type Props = {
	type?: SalesType | string | null;
	uuid?: string | null;
};

function normalizeSalesType(type?: SalesType | string | null): SalesType {
	return type === "quote" ? "quote" : "order";
}

export function SalesOverviewVersionMenuItems({ type, uuid }: Props) {
	const overviewOpen = useSalesOverviewOpen();
	const resolvedType = normalizeSalesType(type);
	const overviewUuid = uuid ?? null;

	if (!overviewUuid) return null;

	return (
		<Env isDev>
			<SalesMenu.Sub>
				<SalesMenu.SubTrigger className="whitespace-nowrap">
					<Icons.ExternalLink className="mr-2 size-4 text-muted-foreground/70" />
					<span className="whitespace-nowrap">Open overview</span>
					<span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
						v2
					</span>
				</SalesMenu.SubTrigger>
				<SalesMenu.SubContent>
					{resolvedType === "quote" ? (
						<>
							<SalesMenu.Item
								className="whitespace-nowrap"
								onSelect={(event) => {
									event.preventDefault();
									overviewOpen.openQuoteSheet(overviewUuid);
								}}
							>
								Open v2 sheet
							</SalesMenu.Item>
							<SalesMenu.Item
								className="whitespace-nowrap"
								onSelect={(event) => {
									event.preventDefault();
									overviewOpen.openQuotePage(overviewUuid);
								}}
							>
								Open v2 page
							</SalesMenu.Item>
						</>
					) : (
						<>
							<SalesMenu.Item
								className="whitespace-nowrap"
								onSelect={(event) => {
									event.preventDefault();
									overviewOpen.openSalesAdminSheet(overviewUuid);
								}}
							>
								Open v2 sheet
							</SalesMenu.Item>
							<SalesMenu.Item
								className="whitespace-nowrap"
								onSelect={(event) => {
									event.preventDefault();
									overviewOpen.openSalesAdminPage(overviewUuid);
								}}
							>
								Open v2 page
							</SalesMenu.Item>
						</>
					)}
				</SalesMenu.SubContent>
			</SalesMenu.Sub>
		</Env>
	);
}
