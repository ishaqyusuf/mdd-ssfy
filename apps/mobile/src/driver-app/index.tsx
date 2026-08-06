import { LoginTemplate0 } from "@/components/login-template-0";
import { useAuthContext } from "@/hooks/use-auth";
import { Redirect } from "expo-router";

export default function DriverPlatformIndex() {
	const { currentSection, profile, token } = useAuthContext();
	const canAccessPrivatePlatform = Boolean(
		currentSection?.isDispatch ||
			currentSection?.isDriver ||
			profile?.can?.viewDelivery ||
			profile?.can?.viewPickup,
	);

	if (!token) return <LoginTemplate0 />;
	if (!canAccessPrivatePlatform) return <Redirect href="/unavailable" />;

	return <Redirect href="/(drivers)" />;
}
