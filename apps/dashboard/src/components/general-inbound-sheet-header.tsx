import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
export function GeneralInboundSheetHeader() {
	return (
		<SheetHeader>
			<SheetTitle>New warehouse inbound</SheetTitle>
			<SheetDescription>
				Receive general warehouse stock using the standard receipt and audit
				workflow.
			</SheetDescription>
		</SheetHeader>
	);
}
