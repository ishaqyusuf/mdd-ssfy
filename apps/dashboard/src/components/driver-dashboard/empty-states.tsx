import { Button } from "@gnd/ui/button";
import { ClipboardCheck, RefreshCcw, SearchX } from "lucide-react";

export function DriverDashboardEmptyState({
	filtered,
	onClear,
}: {
	filtered: boolean;
	onClear: () => void;
}) {
	const Icon = filtered ? SearchX : ClipboardCheck;
	return (
		<div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 text-center">
			<span className="flex size-11 items-center justify-center rounded-full bg-muted">
				<Icon className="size-5 text-muted-foreground" />
			</span>
			<h2 className="mt-4 font-semibold">
				{filtered ? "No stops match this view" : "Your route is clear"}
			</h2>
			<p className="mt-1 max-w-sm text-sm text-muted-foreground">
				{filtered
					? "Clear the search or return to today’s route to see assigned work."
					: "New assignments will appear here as soon as dispatch sends them."}
			</p>
			{filtered ? (
				<Button variant="outline" className="mt-4" onClick={onClear}>
					<RefreshCcw className="mr-2 size-4" />
					Clear filters
				</Button>
			) : null}
		</div>
	);
}
