"use client";

import {
	JobFormProvider,
	useCreateJobFormContext,
} from "@/contexts/job-form-context";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { Sheet } from "@gnd/ui/sheet";
import { JobSheetContent } from "./job-sheet-content";

export function NewJobModal() {
	const { setParams, opened } = useJobFormParams();
	const jobFormContext = useCreateJobFormContext();
	return (
		<Sheet
			open={opened}
			onOpenChange={(open) => {
				if (!open) setParams(null);
			}}
		>
			<JobFormProvider value={jobFormContext}>
				<JobSheetContent />
			</JobFormProvider>
		</Sheet>
	);
}
