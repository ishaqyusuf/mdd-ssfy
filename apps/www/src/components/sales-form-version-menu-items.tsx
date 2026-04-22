"use client";

import { Env } from "@/components/env";
import { SalesMenu } from "@/components/sales-menu";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { Icons } from "@gnd/ui/icons";
import type { SalesType } from "@sales/types";

type Props = {
	slug?: string | null;
	type?: SalesType | string | null;
	uuid?: string | null;
	includeOverviewV2?: boolean;
};

function normalizeSalesType(type?: SalesType | string | null): SalesType {
	return type === "quote" ? "quote" : "order";
}

function getV2SalesFormUrl(type: SalesType, slug: string) {
	return `/sales-form/edit-${type}/${slug}`;
}

export function SalesFormVersionMenuItems({
	slug,
	type,
	uuid,
	includeOverviewV2 = false,
}: Props) {
	const overviewOpen = useSalesOverviewOpen();
	const resolvedType = normalizeSalesType(type);
	const formSlug = slug ?? null;
	const overviewUuid = uuid ?? null;
	const canOpenForm = Boolean(formSlug);
	const canOpenOverviewV2 = Boolean(includeOverviewV2 && overviewUuid);

	return (
		<Env isDev>
			{canOpenOverviewV2 ? (
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
									onSelect={(e) => {
										e.preventDefault();
										if (!overviewUuid) return;
										overviewOpen.openQuoteSheet(overviewUuid);
									}}
								>
									Open v2 sheet
								</SalesMenu.Item>
								<SalesMenu.Item
									className="whitespace-nowrap"
									onSelect={(e) => {
										e.preventDefault();
										if (!overviewUuid) return;
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
									onSelect={(e) => {
										e.preventDefault();
										if (!overviewUuid) return;
										overviewOpen.openSalesAdminSheet(overviewUuid);
									}}
								>
									Open v2 sheet
								</SalesMenu.Item>
								<SalesMenu.Item
									className="whitespace-nowrap"
									onSelect={(e) => {
										e.preventDefault();
										if (!overviewUuid) return;
										overviewOpen.openSalesAdminPage(overviewUuid);
									}}
								>
									Open v2 page
								</SalesMenu.Item>
							</>
						)}
					</SalesMenu.SubContent>
				</SalesMenu.Sub>
			) : null}
			{canOpenForm ? (
				<SalesMenu.Sub>
					<SalesMenu.SubTrigger className="whitespace-nowrap">
						<Icons.Edit className="mr-2 size-4 text-muted-foreground/70" />
						<span className="whitespace-nowrap">Open form</span>
					</SalesMenu.SubTrigger>
					<SalesMenu.SubContent>
						<SalesMenu.Item
							className="whitespace-nowrap"
							onSelect={(e) => {
								e.preventDefault();
								if (!formSlug) return;
								openLink(salesFormUrl(resolvedType, formSlug, true), {}, true);
							}}
						>
							Open with v1
						</SalesMenu.Item>
						<SalesMenu.Item
							className="whitespace-nowrap"
							onSelect={(e) => {
								e.preventDefault();
								if (!formSlug) return;
								openLink(getV2SalesFormUrl(resolvedType, formSlug), {}, true);
							}}
						>
							Open with v2
						</SalesMenu.Item>
					</SalesMenu.SubContent>
				</SalesMenu.Sub>
			) : null}
		</Env>
	);
}
