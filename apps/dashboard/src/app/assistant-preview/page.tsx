import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { notFound } from "next/navigation";

// Isolated synthetic UI review only. Never available in production.
export default function AssistantPreviewPage() {
	if (process.env.NODE_ENV !== "development") notFound();
	return <AssistantWorkspace />;
}
