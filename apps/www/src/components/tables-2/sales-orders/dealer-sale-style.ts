export function getDealerSaleOrderNumberClassName(isDealerSale: boolean) {
	return isDealerSale ? "text-cyan-700 dark:text-cyan-400" : undefined;
}

export function getDealerSaleOrderCellClassName(isDealerSale: boolean) {
	return isDealerSale
		? "-my-2 -ml-2 w-[calc(100%+0.5rem)] border-l-3 border-cyan-700 py-2 pl-2 dark:border-cyan-400"
		: undefined;
}
