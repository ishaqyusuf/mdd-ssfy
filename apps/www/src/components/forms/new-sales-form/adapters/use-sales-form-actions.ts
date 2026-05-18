import { useNewSalesFormStore } from "../store";

export function useSalesFormActions() {
	return {
		addLineItem: useNewSalesFormStore((state) => state.addLineItem),
		updateLineItem: useNewSalesFormStore((state) => state.updateLineItem),
		removeLineItem: useNewSalesFormStore((state) => state.removeLineItem),
		setMeta: useNewSalesFormStore((state) => state.setMeta),
		setSummary: useNewSalesFormStore((state) => state.setSummary),
		setEditor: useNewSalesFormStore((state) => state.setEditor),
	};
}
