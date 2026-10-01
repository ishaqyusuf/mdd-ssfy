import { useJobFormParams } from "@/hooks/use-job-form-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SheetFooter } from "@gnd/ui/sheet";

export function NewJobFooter() {
	const { step, setParams } = useJobFormParams();
	return (
		<SheetFooter className="flex shrink-0 flex-row items-center gap-2 border-t bg-background p-4">
			{step > 1 && (
				<Button variant="outline" onClick={() => setParams({ step: step - 1 })}>
					<Icons.ChevronLeft data-icon="inline-start" />
					Back
				</Button>
			)}
			<Button variant="ghost" onClick={() => setParams(null)}>
				Cancel
			</Button>
			<div className="min-w-0 flex-1" />
			<div className="shrink-0" id="jobActionButton" />
		</SheetFooter>
	);
}
