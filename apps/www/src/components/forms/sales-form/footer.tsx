import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { AnimatedNumber } from "@/components/animated-number";

export function Footer() {
	const zus = useFormDataStore();

	return (
		<div className="space-y-3">
			<div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-right">
				<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
					Total
				</p>
				<p className="text-2xl font-black leading-tight text-foreground">
					<AnimatedNumber value={zus?.metaData?.pricing?.grandTotal || 0} />
				</p>
			</div>
		</div>
	);
}
