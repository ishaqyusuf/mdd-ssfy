import { ChartSelectors } from "@/components/charts-sales/chart-selectors";
import { startOfMonth, startOfYear, subMonths } from "date-fns";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const maxDuration = 30;
export const metadata: Metadata = {
	title: "Overview | Sales",
};
const defaultValue = {
	from: subMonths(startOfMonth(new Date()), 12).toISOString(),
	to: new Date().toISOString(),
};
export default async function Overview({ searchParams }) {
	return (
		<PageShell>
			<div>
				<div className="h-[540px] mb-4">
					<ChartSelectors defaultValue={defaultValue} />
				</div>
			</div>
		</PageShell>
	);
}
