import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { LiveAssistantWorkspace } from "@/components/assistant/live-assistant-workspace";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function AssistantPage() {
	const profile = await getLoggedInProfile();
	if (
		!profile.can.viewOrders &&
		!profile.can.editOrders &&
		!profile.can.viewSales
	) {
		redirect("/");
	}
	return (
		<Suspense>
			<LiveAssistantWorkspace />
		</Suspense>
	);
}
