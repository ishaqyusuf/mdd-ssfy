import Sheet from "@gnd/ui/custom/sheet-v2";
import { SheetFooter } from "@gnd/ui/sheet";

import { useDispatch } from "./context";

export function DispatchFooter() {
	const ctx = useDispatch();
	const { openForm, setOpenForm } = ctx;
	if (openForm) return null;
	return (
		<Sheet.Portal>
			<SheetFooter className="border-t bg-background p-4 md:p-6" />
		</Sheet.Portal>
	);
}
