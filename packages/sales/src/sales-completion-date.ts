import { getDispatchBusinessDate, resolveDispatchTimeZone } from "./dispatch-manifest/driver-work-queue";

export function getSalesCompletionDateContext(now = new Date(), configuredTimeZone?: string) {
	const timeZone = resolveDispatchTimeZone(configuredTimeZone);
	return { today: getDispatchBusinessDate(now, timeZone)!, timeZone };
}
