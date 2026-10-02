import { GeneralInboundForm } from "@/components/forms/general-inbound/form";
import { GeneralInboundSheetHeader } from "@/components/general-inbound-sheet-header";
import { SheetContent } from "@gnd/ui/sheet";
export function GeneralInboundContent() {
	return (
		<SheetContent className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-xl">
			<GeneralInboundSheetHeader />
			<GeneralInboundForm />
		</SheetContent>
	);
}
