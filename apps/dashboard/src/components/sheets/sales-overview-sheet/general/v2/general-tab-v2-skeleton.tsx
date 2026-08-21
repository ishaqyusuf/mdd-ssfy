import { Skeleton } from "@gnd/ui/skeleton";

const operationSkeletons = ["production", "fulfillment"] as const;
const orderFactSkeletons = [
	"order-number",
	"age",
	"type",
	"inbound-status",
	"po-number",
	"sales-representative",
] as const;

export function GeneralTabV2Skeleton() {
	return (
		<div
			className="flex flex-col"
			aria-label="Loading Sales Overview General tab"
		>
			<div className="grid grid-cols-3 gap-2 border-b py-3">
				<Skeleton className="h-9 rounded-md" />
				<Skeleton className="h-9 rounded-md" />
				<Skeleton className="h-9 rounded-md" />
			</div>
			<div className="grid min-w-0 grid-cols-1 items-stretch lg:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.92fr)]">
				<div className="flex min-w-0 flex-col gap-6 pb-5 pt-5 lg:border-r lg:pb-24 lg:pr-5">
					<section className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-4 w-24 rounded" />
							<Skeleton className="h-8 w-28 rounded-md" />
						</div>
						<Skeleton className="h-6 w-52 rounded" />
						<Skeleton className="h-4 w-32 rounded" />
						<Skeleton className="h-14 w-full rounded" />
					</section>
					<section className="grid grid-cols-2 gap-4 border-t pt-5">
						{orderFactSkeletons.map((key) => (
							<div key={key} className="flex flex-col gap-2">
								<Skeleton className="h-3 w-20 rounded" />
								<Skeleton className="h-5 w-28 rounded" />
							</div>
						))}
					</section>
					<section className="flex flex-col gap-3 border-t pt-5">
						<Skeleton className="h-4 w-32 rounded" />
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-4 w-24 rounded" />
							<Skeleton className="h-5 w-20 rounded-full" />
						</div>
					</section>
					<div className="grid grid-cols-1 gap-3 border-t pt-5 sm:grid-cols-2">
						{operationSkeletons.map((key) => (
							<div key={key} className="flex flex-col gap-2">
								<Skeleton className="h-3 w-full rounded" />
								<Skeleton className="h-1.5 w-full rounded" />
							</div>
						))}
					</div>
				</div>
				<div className="flex min-w-0 flex-col gap-4 border-t bg-muted/20 pb-24 pt-5 lg:border-t-0 lg:px-5">
					<Skeleton className="h-5 w-32 rounded" />
					<Skeleton className="h-10 w-40 rounded" />
					<Skeleton className="h-1.5 w-full rounded" />
					<Skeleton className="h-48 w-full rounded-md" />
				</div>
			</div>
		</div>
	);
}
