import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { StepsDescription } from "./steps-description";

export function JobSheetHeader() {
	const { jobId } = useJobFormParams();
	const { formType } = useJobStepInfo();
	return (
		<SheetHeader className="shrink-0 gap-2 px-5 py-5 pr-12 text-left">
			<SheetTitle data-job-sheet-title tabIndex={-1}>
				{jobId
					? `Edit job #${jobId}`
					: formType === "assign"
						? "New job"
						: "Submit a job"}
			</SheetTitle>
			<SheetDescription>
				<span id="step-title" />
			</SheetDescription>
			<StepsDescription />
		</SheetHeader>
	);
}
