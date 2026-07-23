import type { DealerNextStepGuidance } from "@/lib/dealer-next-step";
import { cn } from "@gnd/ui/cn";

const toneStyles = {
	neutral: "border-slate-200 bg-slate-50",
	attention: "border-amber-200 bg-amber-50",
	positive: "border-emerald-200 bg-emerald-50",
	complete: "border-emerald-200 bg-emerald-50",
} satisfies Record<DealerNextStepGuidance["tone"], string>;

export function DealerNextStep({
	guidance,
	compact = false,
}: {
	guidance: DealerNextStepGuidance;
	compact?: boolean;
}) {
	if (compact) {
		return (
			<div className="max-w-[280px]">
				<p className="text-sm font-medium">{guidance.title}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{guidance.description}
				</p>
			</div>
		);
	}

	return (
		<section className={cn("rounded-lg border p-4", toneStyles[guidance.tone])}>
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				What happens next
			</p>
			<h2 className="mt-1 text-base font-semibold">{guidance.title}</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				{guidance.description}
			</p>
		</section>
	);
}
