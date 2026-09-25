import { Icons } from "@gnd/ui/icons";

type Props = {
	active: number;
	pending: number;
	shown: number;
	verified: number;
	isLoading: boolean;
};

const cards = [
	{
		key: "shown",
		label: "Dealers shown",
		detail: "Accounts in this view",
		Icon: Icons.ListTodo,
		color:
			"border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
		iconColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
	},
	{
		key: "active",
		label: "Active",
		detail: "Ready to sell",
		Icon: Icons.CheckCircle,
		color:
			"border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
		iconColor:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
	},
	{
		key: "pending",
		label: "Pending approval",
		detail: "Awaiting activation",
		Icon: Icons.Clock,
		color:
			"border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
		iconColor:
			"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
	},
	{
		key: "verified",
		label: "Verified",
		detail: "Verified accounts",
		Icon: Icons.CheckCircle2,
		color:
			"border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
		iconColor:
			"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200",
	},
] as const;

export function DealerSummaryWidgets({ isLoading, ...counts }: Props) {
	return (
		<section
			aria-label="Dealer overview"
			className="grid grid-cols-2 gap-3 lg:grid-cols-4"
		>
			{cards.map(({ key, label, detail, Icon, color, iconColor }) => (
				<div
					key={key}
					className={`flex min-h-32 flex-col justify-between rounded-xl border p-4 sm:min-h-36 sm:p-5 ${color}`}
				>
					<div className="flex items-start justify-between gap-2">
						<span className="text-xs font-semibold uppercase tracking-wide sm:text-sm">
							{label}
						</span>
						<span className={`rounded-lg p-2 ${iconColor}`}>
							<Icon className="size-4" />
						</span>
					</div>
					<div>
						<p
							className="text-3xl font-semibold tabular-nums sm:text-4xl"
							aria-label={
								isLoading ? `Loading ${label}` : `${counts[key]} ${label}`
							}
						>
							{isLoading ? (
								<span className="inline-block h-8 w-12 animate-pulse rounded bg-current/10" />
							) : (
								counts[key].toLocaleString()
							)}
						</p>
						<p className="mt-1 text-xs opacity-75 sm:text-sm">{detail}</p>
					</div>
				</div>
			))}
		</section>
	);
}
