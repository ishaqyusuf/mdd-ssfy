import { Skeleton } from "@gnd/ui/skeleton";

export function ProductionTabV2Skeleton() {
	return (
		<div
			className="flex flex-col gap-3 p-4"
			aria-label="Loading production items"
		>
			{["first", "second", "third"].map((key) => (
				<Skeleton className="h-20 w-full" key={key} />
			))}
		</div>
	);
}
