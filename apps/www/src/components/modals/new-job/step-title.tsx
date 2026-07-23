import Portal from "@gnd/ui/custom/portal";

export function StepTitle({ title }: { title: string }) {
	return (
		<Portal nodeId="step-title" noDelay>
			<span className="block text-muted-foreground sm:inline">
				<span className="hidden sm:inline">{" - "}</span>
				{title}
			</span>
		</Portal>
	);
}
