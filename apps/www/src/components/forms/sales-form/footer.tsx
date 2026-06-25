import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { AnimatedNumber } from "@/components/animated-number";

export function Footer() {
	const zus = useFormDataStore();
	const pricing = zus?.metaData?.pricing;
	const ccc = Number(pricing?.ccc || 0);
	const displayTotal = Number(
		pricing?.totalWithCcc ?? Number(pricing?.grandTotal || 0) + ccc,
	);

	return (
		<div className="space-y-3">
			<div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-right">
				<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
					{ccc > 0 ? "Total With C.C.C" : "Total"}
				</p>
				<p className="text-2xl font-black leading-tight text-foreground">
					<AnimatedNumber value={displayTotal} />
				</p>
				{ccc > 0 ? (
					<p className="mt-1 text-[11px] font-medium text-muted-foreground">
						Order total excludes C.C.C
					</p>
				) : null}
			</div>
		</div>
	);
}
