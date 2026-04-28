import { ClientAuthGuard } from "@/components/auth/client-auth-guard";
import { GlobalModalsProvider } from "@/components/modals/global-modals-provider";
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotificationProvider } from "@/components/task-notification-provider";
import { authOptions } from "@/lib/auth-options";
import { HydrateClient } from "@/trpc/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Layout({ children }) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login/v2");
	}

	const initialAuth = {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name,
		can: session.can,
		role: session.role,
		avatar: null,
	};

	return (
		<HydrateClient>
			<ClientAuthGuard>
				<div className="relative">
					<SidebarContent initialAuth={initialAuth}>{children}</SidebarContent>

					<GlobalSheetsProvider />
					<GlobalModalsProvider />
					<TaskNotificationProvider />

					{/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
				</div>
			</ClientAuthGuard>
		</HydrateClient>
	);
}
