"use client";

import { useAssistantDiagnosticParams } from "@/hooks/use-assistant-diagnostic-params";
import { Button } from "@gnd/ui/button";
import { useAssistantDiagnosticUi } from "./assistant-diagnostic-ui-gate";

export function AssistantOutcomeHelp({ reference }: { reference: string }) {
	const { setReference } = useAssistantDiagnosticParams();
	const diagnosticUiEnabled = useAssistantDiagnosticUi();
	return (
		<details className="mt-2 text-xs text-muted-foreground">
			<summary className="cursor-pointer">Help</summary>
			<p className="mt-2">
				If you need help, share this reference with your administrator:{" "}
				{reference}
			</p>
			{diagnosticUiEnabled ? (
				<Button
					size="sm"
					variant="ghost"
					className="mt-2"
					onClick={() => void setReference(reference)}
				>
					View diagnostics
				</Button>
			) : null}
		</details>
	);
}
