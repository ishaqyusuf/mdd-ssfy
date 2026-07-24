import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import { DataSkeleton } from "@/components/data-skeleton";
import { LabelInput } from "@/components/label-input";
import { useDebounce } from "@/hooks/use-debounce";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useRef, useState } from "react";

type SalesPoStatus = "idle" | "saving" | "saved" | "failed";
type SalesDocumentType = "order" | "quote";

export function normalizeSalesPo(value?: string | null) {
	return String(value || "")
		.trim()
		.toUpperCase();
}

export function SalesPO({
	value,
	salesId,
	salesType,
}: {
	value?: string | null;
	salesId?: number | null;
	salesType: SalesDocumentType;
}) {
	const ctx = useSalesOverviewQuery();
	const initialValue = normalizeSalesPo(value);
	const [inputValue, setInputValue] = useState(initialValue);
	const [status, setStatus] = useState<SalesPoStatus>("idle");
	const debouncedValue = useDebounce(inputValue, 1000);
	const lastSavedValueRef = useRef(initialValue);
	const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
	const requestIdRef = useRef(0);
	const mountedRef = useRef(true);
	const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const invalidationRef = useRef(ctx.salesQuery.invalidate);

	useEffect(() => {
		invalidationRef.current = ctx.salesQuery.invalidate;
	});

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
		};
	}, []);

	useEffect(() => {
		const previousValue = lastSavedValueRef.current;
		const nextValue = normalizeSalesPo(value);
		lastSavedValueRef.current = nextValue;
		setInputValue((currentValue) =>
			normalizeSalesPo(currentValue) === previousValue
				? nextValue
				: currentValue,
		);
	}, [value]);

	useEffect(() => {
		if (!salesId) return;
		const nextValue = normalizeSalesPo(debouncedValue);
		if (nextValue === lastSavedValueRef.current) return;

		const requestId = ++requestIdRef.current;
		setStatus("saving");
		if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

		saveQueueRef.current = saveQueueRef.current
			.catch(() => undefined)
			.then(async () => {
				try {
					const response = await updateSalesMetaAction(salesId, {
						po: nextValue,
					});
					lastSavedValueRef.current = normalizeSalesPo(response.po);
					await Promise.all([
						invalidationRef.current.saleOverview(),
						invalidationRef.current.salesDocumentChanged(salesType),
					]);

					if (!mountedRef.current || requestId !== requestIdRef.current) {
						return;
					}
					setStatus("saved");
					statusTimerRef.current = setTimeout(() => {
						if (mountedRef.current) setStatus("idle");
					}, 1500);
				} catch {
					if (!mountedRef.current || requestId !== requestIdRef.current) {
						return;
					}
					setStatus("failed");
					toast({
						title: "P.O. number was not saved",
						description: "Try the update again.",
						variant: "destructive",
					});
				}
			});
	}, [debouncedValue, salesId, salesType]);

	return (
		<div>
			<p className="text-muted-foreground">P.O No</p>
			<DataSkeleton className="font-medium" placeholder="Standard">
				<div className="flex min-h-8 items-center gap-2">
					<LabelInput
						aria-label="P.O. number"
						onChange={(event) => setInputValue(event.target.value)}
						className="w-24 uppercase"
						value={inputValue}
					/>
					<span
						aria-live="polite"
						className="flex min-w-14 items-center gap-1 text-xs text-muted-foreground"
					>
						{status === "saving" ? (
							<>
								<Icons.Loader2 className="size-3.5 animate-spin" />
								Saving
							</>
						) : status === "saved" ? (
							<>
								<Icons.Check className="size-3.5 text-emerald-600" />
								Saved
							</>
						) : status === "failed" ? (
							<>
								<Icons.AlertCircle className="size-3.5 text-destructive" />
								Failed
							</>
						) : null}
					</span>
				</div>
			</DataSkeleton>
		</div>
	);
}
