const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function formatPaymentAmount(value?: number | null) {
	return currency.format(Number(value || 0));
}

export function formatPaymentDate(value: string | number | Date) {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
