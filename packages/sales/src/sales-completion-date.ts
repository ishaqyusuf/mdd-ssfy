import { getDispatchBusinessDate, resolveDispatchTimeZone } from "./dispatch-manifest/driver-work-queue";

export function getSalesCompletionDateContext(now = new Date(), configuredTimeZone?: string) {
	const timeZone = resolveDispatchTimeZone(configuredTimeZone);
	return { today: getDispatchBusinessDate(now, timeZone)!, timeZone };
}

export function assertSalesCompletionDate(
	receivedDate: Date | null | undefined,
	now = new Date(),
	configuredTimeZone?: string,
) {
	if (receivedDate == null) return;
	if (!Number.isFinite(receivedDate.getTime())) {
		throw new Error("Choose a valid delivery date.");
	}
	const { today, timeZone } = getSalesCompletionDateContext(now, configuredTimeZone);
	const deliveryDay = getDispatchBusinessDate(receivedDate, timeZone)!;
	if (deliveryDay > today) {
		throw new Error("Delivery date cannot be after today in the business timezone.");
	}
}
