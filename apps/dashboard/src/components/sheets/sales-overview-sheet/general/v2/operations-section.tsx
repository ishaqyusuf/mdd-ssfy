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
}: {
	production: Omit<Operation, "key" | "label">;
	fulfillment: Omit<Operation, "key" | "label">;
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
