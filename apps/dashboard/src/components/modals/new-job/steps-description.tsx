import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { cn } from "@gnd/ui/cn";

export function StepsDescription() {
	const { formType } = useJobStepInfo();
	const { step } = useJobFormParams();
	const labels =
		formType === "assign"
			? ["Contractor", "Project", "Task", "Unit", "Details"]
			: ["Project", "Task", "Unit", "Details"];
	const activeStep = Math.max(1, Math.min(labels.length, step || 1));
	return (
		<ol
			className="flex flex-wrap gap-x-3 gap-y-2 text-xs"
			aria-label="Job setup progress"
		>
			{labels.map((label, index) => (
				<li
					key={label}
					aria-current={activeStep === index + 1 ? "step" : undefined}
					className={cn(
						"flex items-center gap-1.5 text-muted-foreground",
						activeStep === index + 1 && "font-medium text-foreground",
					)}
				>
					<span
						className={cn(
							"flex size-5 items-center justify-center rounded-full border",
							activeStep >= index + 1 &&
								"border-primary bg-primary text-primary-foreground",
						)}
					>
						{index + 1}
					</span>
					{label}
				</li>
			))}
		</ol>
	);
}
