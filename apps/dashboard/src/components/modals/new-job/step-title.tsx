import Portal from "@gnd/ui/custom/portal";

export function StepTitle({ title }: { title: string }) {
	return (
		<Portal nodeId="step-title" noDelay>
			<span>{title}</span>
		</Portal>
	);
}
