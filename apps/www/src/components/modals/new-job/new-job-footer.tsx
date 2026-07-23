import { useJobFormParams } from "@/hooks/use-job-form-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { CustomModal } from "../custom-modal";

export function NewJobFooter() {
	const { step, setParams } = useJobFormParams();
	const handleBack = () => {
		if (step && step > 1) {
			setParams({
				step: step - 1,
			});
		}
	};
	const onClose = () => {
		setParams(null);
	};
	return (
		<CustomModal.Portal>
			<CustomModal.Footer className="flex shrink-0 flex-row items-center justify-between gap-2 border-border bg-muted/20">
				{step > 1 && (
					<Button onClick={step === 1 ? onClose : handleBack} variant="outline">
						{step === 1 ? (
							"Cancel"
						) : (
							<>
								<Icons.ChevronLeft className="size-4" /> Back
							</>
						)}
					</Button>
				)}
				<div className="min-w-0 flex-1" />
				{step > 1 && (
					<Button onClick={onClose} variant="destructive">
						Cancel
					</Button>
				)}
				<div className="shrink-0" id="jobActionButton" />
			</CustomModal.Footer>
		</CustomModal.Portal>
	);
}
