import { Env } from "@/components/env";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Spinner } from "@gnd/ui/spinner";
import type { PaymentOverlayState } from "./types";
import { formatElapsedTime, formatPaymentAmount } from "./utils";

export function PaymentStatusOverlay({
	state,
	amount,
	methodLabel,
	terminalName,
	elapsedSeconds,
	error,
	onCancel,
	onBack,
	onMockCancel,
	onMockComplete,
}: {
	state: Exclude<PaymentOverlayState, "form">;
	amount?: number | string | null;
	methodLabel?: string | null;
	terminalName?: string | null;
	elapsedSeconds?: number | null;
	error?: string | null;
	onCancel: () => void;
	onBack: () => void;
	onMockCancel: () => void;
	onMockComplete: () => void;
}) {
	const isLoading =
		state === "applying" ||
		state === "creating" ||
		state === "awaiting" ||
		state === "recording";
	const isSuccess = state === "success";
	const titles: Record<Exclude<PaymentOverlayState, "form">, string> = {
		applying: "Applying payment",
		creating: "Sending to terminal",
		awaiting: "Waiting for payment",
		recording: "Recording payment",
		success: "Payment complete",
		failed: "Payment failed",
	};
	const descriptions: Record<Exclude<PaymentOverlayState, "form">, string> = {
		applying: "Recording this payment and updating the selected orders.",
		creating: "Preparing this charge on the selected Square terminal.",
		awaiting: "Complete the payment on the Square terminal.",
		recording: "Payment was received. We are applying it to the order.",
		success: "The sale payment was recorded successfully.",
		failed: error || "The payment could not be completed.",
	};
	const title = titles[state];
	const description = descriptions[state];
	const Icon = isSuccess
		? Icons.CheckCircle
		: state === "failed"
			? Icons.AlertCircle
			: Icons.payment;

	return (
		<div className="animate-in fade-in-0 zoom-in-95 grid min-h-[535px] place-items-center p-6 duration-200">
			<div className="grid w-full max-w-sm gap-6 text-center">
				<div className="mx-auto grid size-24 place-items-center rounded-full border bg-background shadow-sm">
					{isLoading ? (
						<div className="relative grid size-16 place-items-center">
							<span
								className={cn(
									"absolute size-16 rounded-full",
									state === "awaiting" && "animate-ping bg-blue-500/20",
									state !== "awaiting" && "bg-blue-500/10",
								)}
							/>
							<span className="absolute size-12 rounded-full bg-blue-500/10" />
							<span className="relative text-blue-600">
								<Spinner />
							</span>
						</div>
					) : (
						<Icon
							className={cn(
								"size-12",
								isSuccess ? "text-emerald-600" : "text-destructive",
							)}
						/>
					)}
				</div>

				<div className="grid gap-2">
					<h3 className="text-xl font-semibold">{title}</h3>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>

				<div className="grid gap-2 rounded-md border bg-muted/20 p-4 text-left text-sm">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Amount</span>
						<span className="font-semibold tabular-nums">
							{formatPaymentAmount(amount)}
						</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Method</span>
						<span className="max-w-48 truncate font-medium">
							{methodLabel || "Payment"}
						</span>
					</div>
					{terminalName ? (
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground">Terminal</span>
							<span className="max-w-48 truncate font-medium">
								{terminalName}
							</span>
						</div>
					) : null}
					{state === "awaiting" ? (
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground">Elapsed</span>
							<span className="font-medium tabular-nums">
								{formatElapsedTime(elapsedSeconds)}
							</span>
						</div>
					) : null}
				</div>

				{state === "awaiting" ? (
					<div className="flex items-center justify-center gap-2">
						<Env isDev>
							<Button
								type="button"
								onClick={onMockCancel}
								size="icon"
								variant="outline"
							>
								<Icons.X className="size-4" />
							</Button>
							<Button
								type="button"
								onClick={onMockComplete}
								size="icon"
								variant="outline"
							>
								<Icons.check className="size-4" />
							</Button>
						</Env>
						<Button type="button" onClick={onCancel} variant="destructive">
							<Icons.X className="size-4" />
							Cancel payment
						</Button>
					</div>
				) : state === "failed" ? (
					<Button type="button" onClick={onBack} variant="outline">
						<Icons.arrowLeft className="size-4" />
						Back to payment form
					</Button>
				) : state === "success" ? (
					<p className="text-xs text-muted-foreground">
						This window will close automatically.
					</p>
				) : null}
			</div>
		</div>
	);
}
