import { ClientAuthGuard } from "@/components/auth/client-auth-guard";
import { GlobalModalsProvider } from "@/components/modals/global-modals-provider";
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotificationProvider } from "@/components/task-notification-provider";
import { prisma } from "@/db";
import type { InitialAuthState } from "@/hooks/use-auth";
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

	const initialAuth: InitialAuthState = {
		id: String(session.user.id),
		email: session.user.email,
		name: session.user.name,
		can: session.can,
		role: session.role ? { name: session.role.name } : null,
		avatar: null,
	};
	const pageTabDefaults = await loadPageTabDefaults(Number(session.user.id));

	return (
		<HydrateClient>
			<ClientAuthGuard>
				<div className="relative">
					<SidebarContent
						initialAuth={initialAuth}
						pageTabDefaults={pageTabDefaults}
					>
						{children}
					</SidebarContent>

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

async function loadPageTabDefaults(userId: number) {
	if (!Number.isFinite(userId)) return {};

	const defaults = await prisma.pageTabIndex.findMany({
		where: {
			userId,
			default: true,
			deletedAt: null,
			tab: {
				userId,
				private: true,
				deletedAt: null,
			},
		},
		include: {
			tab: true,
		},
	});

	return Object.fromEntries(
		defaults.map((entry) => {
			const page = normalizePage(entry.tab.page);
			const query = normalizeQuery(entry.tab.query);
			return [page, query ? `${page}?${query}` : page];
		}),
	);
}

function normalizePage(page: string) {
	const [path] = page.split("?");
	if (!path) return "/";
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function normalizeQuery(query: string) {
	const params = new URLSearchParams(
		query.startsWith("?") ? query.slice(1) : query,
	);
	params.delete("_page");

	return Array.from(params.entries())
		.filter(([, value]) => value !== "")
		.sort(([left], [right]) => left.localeCompare(right))
		.reduce((next, [key, value]) => {
			next.append(key, value);
			return next;
		}, new URLSearchParams())
		.toString();
}
