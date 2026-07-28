import { GuardedOpenJobSheet } from "@/components/guarded-open-job-sheet";
import { JobsDashboardNav } from "@/components/jobs-dashboard-nav";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { ReactNode } from "react";

export default function JobsDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.08),_transparent_22%)] pt-6">
			<div className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm shadow-slate-200/60 backdrop-blur lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-3">
					<div className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
						Worker workspace
					</div>
					<PageTitle>Job Dashboard</PageTitle>
					<p className="max-w-2xl text-sm leading-6 text-slate-600">
						Track your jobs, payments, and insurance readiness from one focused
						workspace built for contractors.
					</p>
				</div>
				<GuardedOpenJobSheet
					label="Submit Job"
					className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
				/>
			</div>
			<JobsDashboardNav />
			{children}
		</div>
	);
}
