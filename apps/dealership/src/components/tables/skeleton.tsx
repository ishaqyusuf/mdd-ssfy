export function TableSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			<div className="h-10 animate-pulse rounded-md bg-muted" />
			{Array.from({ length: 8 }).map((_, index) => (
				<div
					className="h-14 animate-pulse rounded-md border bg-muted/50"
					key={index}
				/>
			))}
		</div>
	);
}
