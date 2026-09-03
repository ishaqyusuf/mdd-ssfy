import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { Icons } from "@gnd/ui/icons";
import { Progress } from "@gnd/ui/progress";
import { SectionHeading } from "./section-heading";

type Operation = {
	key: string;
	label: string;
	status: string;
	percentage: number;
};

export function OperationsSection({
	production,
	fulfillment,
	pipeline,
}: {
	production: Omit<Operation, "key" | "label">;
	fulfillment: Omit<Operation, "key" | "label">;
	pipeline?: SalesPipelineSnapshot | null;
}) {
	const operations: Operation[] = [
		{ key: "production", label: "Production", ...production },
		{ key: "fulfillment", label: "Fulfillment", ...fulfillment },
	];

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="general-v2-operations"
		>
			<SectionHeading
				id="general-v2-operations"
				icon={Icons.BarChart}
				title="Operations"
			/>
			{pipeline ? (
				<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
					<div className="flex items-center justify-between gap-3">
						<strong>{pipeline.headline.label}</strong>
						<span className="font-mono text-[10px] text-muted-foreground">
							{pipeline.revision.slice(0, 10)}
						</span>
					</div>
					{pipeline.blockers.length || pipeline.conflicts.length ? (
						<ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
							{[...pipeline.blockers, ...pipeline.conflicts].map((item) => (
								<li key={`${item.code}-${item.message}`}>{item.message}</li>
							))}
						</ul>
					) : null}
					<details className="mt-2 text-muted-foreground">
						<summary className="cursor-pointer">Lifecycle evidence</summary>
						<p className="mt-1">
							{pipeline.provenance
								.map((item) => `${item.dimension}: ${item.source}`)
								.join(" · ")}
						</p>
					</details>
				</div>
			) : null}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{operations.map((operation) => (
					<div key={operation.key} className="flex min-w-0 flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<strong className="text-xs">{operation.label}</strong>
							<span className="truncate text-xs text-muted-foreground">
								{operation.status}
							</span>
						</div>
						<Progress
							value={operation.percentage}
							aria-label={`${operation.label} ${operation.percentage.toFixed(0)} percent`}
							className="h-1.5"
						/>
					</div>
				))}
			</div>
		</section>
	);
}
