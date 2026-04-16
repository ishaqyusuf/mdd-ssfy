"use client";

import React from "react";
import SignaturePadCanvas from "react-signature-pad-wrapper";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";

interface SignaturePadProps {
	onSignatureChange: (signature: string) => void;
	signatureId: string;
}

export function SignaturePad({
	onSignatureChange,
	signatureId,
}: SignaturePadProps) {
	const padRef = React.useRef<SignaturePadCanvas | null>(null);

	const syncSignatureValue = React.useCallback(() => {
		const pad = padRef.current;
		if (!pad || pad.isEmpty()) {
			onSignatureChange("");
			return;
		}
		onSignatureChange(pad.toDataURL("image/png"));
	}, [onSignatureChange]);

	React.useEffect(() => {
		const canvas = padRef.current?.canvas.current;
		if (!canvas) return;

		const handlePointerEnd = () => {
			syncSignatureValue();
		};

		canvas.addEventListener("pointerup", handlePointerEnd);
		canvas.addEventListener("mouseup", handlePointerEnd);
		canvas.addEventListener("touchend", handlePointerEnd);

		return () => {
			canvas.removeEventListener("pointerup", handlePointerEnd);
			canvas.removeEventListener("mouseup", handlePointerEnd);
			canvas.removeEventListener("touchend", handlePointerEnd);
		};
	}, [syncSignatureValue]);

	const clearSignature = () => {
		padRef.current?.clear();
		onSignatureChange("");
	};

	return (
		<div className="space-y-2">
			<Label>Digital Signature</Label>
			<div className="space-y-2 rounded-lg border bg-white p-4">
				<div className="rounded-md border border-dashed border-gray-300 bg-white">
					<SignaturePadCanvas
						ref={padRef}
						redrawOnResize
						options={{
							minWidth: 1.2,
							maxWidth: 2.4,
							throttle: 12,
							penColor: "#111111",
						}}
						canvasProps={{
							id: signatureId,
							className: "block h-40 w-full cursor-crosshair touch-none",
							style: {
								width: "100%",
								height: "160px",
								touchAction: "none",
								userSelect: "none",
							},
						}}
					/>
				</div>
				<div className="flex justify-between">
					<p className="text-xs text-muted-foreground">Sign above</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={clearSignature}
					>
						Clear
					</Button>
				</div>
			</div>
		</div>
	);
}
