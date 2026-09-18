/** @jsxImportSource react */
"use client";

import {
	type SalesRequestInterpretation,
	getActiveSalesRequestInterpretations,
} from "@gnd/sales/sales-form";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useState } from "react";
import type { NewSalesFormLineItem } from "../schema";

export type DismissSalesRequestInterpretation = (
	interpretation: SalesRequestInterpretation,
) => void | Promise<void>;

export function salesRequestInterpretationKey(
	interpretation: SalesRequestInterpretation,
) {
	return [
		interpretation.lineUid,
		interpretation.stepId,
		interpretation.field,
		interpretation.selectedProdUid,
		interpretation.sourceText,
	].join(":");
}

export function collectActiveSalesRequestInterpretations(
	lineItems: readonly NewSalesFormLineItem[],
) {
	return lineItems.flatMap((line) =>
		getActiveSalesRequestInterpretations(line),
	);
}

export function CustomerRequestInterpretations(props: {
	lineItems: readonly NewSalesFormLineItem[];
	onDismiss?: DismissSalesRequestInterpretation;
}) {
	const [dismissed, setDismissed] = useState(() => new Set<string>());
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const interpretations = collectActiveSalesRequestInterpretations(
		props.lineItems,
	).filter((entry) => !dismissed.has(salesRequestInterpretationKey(entry)));

	if (!interpretations.length) return null;

	return (
		<div className="flex flex-col gap-2">
			{interpretations.map((entry) => {
				const key = salesRequestInterpretationKey(entry);
				const pending = pendingKey === key;
				return (
					<Alert key={key}>
						<Icons.Sparkles aria-hidden="true" />
						<AlertTitle>AI interpretation</AlertTitle>
						<AlertDescription className="flex flex-col items-start gap-2 text-muted-foreground">
							<p>
								“{entry.sourceText}” was interpreted as {entry.selectedTitle}.
							</p>
							<Button
								type="button"
								variant="link"
								size="sm"
								disabled={pending}
								onClick={async () => {
									setPendingKey(key);
									try {
										await props.onDismiss?.(entry);
										setDismissed((current) => new Set(current).add(key));
									} catch {
										return;
									} finally {
										setPendingKey(null);
									}
								}}
							>
								{pending ? "Hiding…" : "Don’t show again"}
							</Button>
						</AlertDescription>
					</Alert>
				);
			})}
		</div>
	);
}
