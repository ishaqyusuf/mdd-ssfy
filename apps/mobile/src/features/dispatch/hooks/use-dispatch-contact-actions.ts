import { Toast } from "@/components/ui/toast";
import { useCallback } from "react";
import { Linking } from "react-native";

async function openExternal(url: string, unavailableMessage: string) {
	try {
		if (!(await Linking.canOpenURL(url))) {
			Toast.show(unavailableMessage, { type: "warning" });
			return;
		}
		await Linking.openURL(url);
	} catch {
		Toast.show(unavailableMessage, { type: "error" });
	}
}

export function useDispatchContactActions(input: {
	phone?: string | null;
	email?: string | null;
	destination?: string | null;
}) {
	const onCallCustomer = useCallback(() => {
		const phone = input.phone?.replace(/[^+\d]/g, "");
		if (!phone) {
			Toast.show("No customer phone number is available.", { type: "warning" });
			return;
		}
		void openExternal(`tel:${phone}`, "Calling is unavailable on this device.");
	}, [input.phone]);

	const onEmailCustomer = useCallback(() => {
		const email = input.email?.replace(/[\r\n]/g, "").trim();
		if (!email || !email.includes("@")) {
			Toast.show("No valid customer email is available.", { type: "warning" });
			return;
		}
		void openExternal(
			`mailto:${email}`,
			"Email is unavailable on this device.",
		);
	}, [input.email]);

	const onOpenDirections = useCallback(() => {
		const destination = input.destination?.trim();
		if (!destination) {
			Toast.show("No routable delivery address is available.", {
				type: "warning",
			});
			return;
		}
		void openExternal(
			`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
			"Maps is unavailable on this device.",
		);
	}, [input.destination]);

	return { onCallCustomer, onEmailCustomer, onOpenDirections };
}
