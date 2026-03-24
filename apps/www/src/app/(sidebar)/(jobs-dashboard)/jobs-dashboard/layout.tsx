import { JobsDashboardNav } from "@/components/jobs-dashboard-nav";
import { OpenJobSheet } from "@/components/open-contractor-jobs-sheet";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { ReactNode } from "react";

export default function JobsDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6 pt-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-2">
					<PageTitle>Job Dashboard</PageTitle>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Track your jobs, payments, and insurance readiness from one worker
						workspace.
					</p>
				</div>
				<OpenJobSheet label="Submit Job" />
			</div>
			<JobsDashboardNav />
			{children}
		</div>
	);
}
