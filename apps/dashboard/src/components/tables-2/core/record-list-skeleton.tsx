import { Skeleton } from "@gnd/ui/skeleton";

export function RecordListSkeleton() {
	return (
		<div className="min-w-0 space-y-3" aria-busy="true" aria-live="polite">
			<p className="sr-only">Loading payment records</p>
			{[1, 2, 3].map((id) => (
				<Skeleton key={id} className="h-28 rounded-xl" />
			))}
		</div>
	);
}
