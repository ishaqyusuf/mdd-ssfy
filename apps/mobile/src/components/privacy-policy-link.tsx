import Constants from "expo-constants";
import { Alert, Linking, Pressable, Text } from "react-native";

const configuredUrl = Constants.expoConfig?.extra?.privacyPolicyUrl;
const privacyPolicyUrl = typeof configuredUrl === "string" ? configuredUrl : "";

export function PrivacyPolicyLink({
	variant = "light",
}: {
	variant?: "light" | "dark";
}) {
	if (!privacyPolicyUrl) return null;

	async function openPrivacyPolicy() {
		try {
			await Linking.openURL(privacyPolicyUrl);
		} catch {
			Alert.alert(
				"Privacy Policy",
				"Unable to open the privacy policy right now.",
			);
		}
	}

	return (
		<Pressable
			accessibilityLabel="Read privacy policy"
			accessibilityHint="Opens the privacy policy in your browser"
			accessibilityRole="link"
			onPress={openPrivacyPolicy}
			className="min-h-11 items-center justify-center px-4 active:opacity-70"
		>
			<Text
				className={
					variant === "dark"
						? "text-sm font-semibold text-zinc-300 underline"
						: "text-sm font-semibold text-primary underline"
				}
			>
				Privacy Policy
			</Text>
		</Pressable>
	);
}
