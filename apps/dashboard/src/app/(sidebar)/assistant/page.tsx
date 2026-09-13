import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { LiveAssistantWorkspace } from "@/components/assistant/live-assistant-workspace";
import { prisma } from "@/db";
import { getAssistantAccessState } from "@api/assistant/access-governance";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function AssistantPage() {
	const profile = await getLoggedInProfile();
	const access = profile.userId
		? await getAssistantAccessState(prisma, profile.userId)
		: null;
	if (!access?.enabled) {
		redirect("/");
	}
	return (
		<Suspense>
			<LiveAssistantWorkspace />
		</Suspense>
	);
}
