import { Env } from "@/components/env";
import { InboundNeedsAttentionProviderLazy } from "@/components/inventory/inbound-needs-attention-provider-lazy";
import { GlobalModalsProvider } from "@/components/modals/global-modals-provider";
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotificationProvider } from "@/components/task-notification-provider";
import type { InitialAuthState } from "@/hooks/use-auth";
import { SessionHydrator } from "@/lib/auth/client";
import type { AppSession } from "@/lib/auth/session";
import { getServerAuthSession } from "@/lib/auth/session";
import { HydrateClient } from "@/trpc/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Layout({ children }) {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const initialAuth: InitialAuthState = {
        id: String(session.user.id),
        email: session.user.email,
        name: session.user.name,
        can: session.can,
        role: session.role ? { name: session.role.name } : null,
        avatar: null,
    };
    const clientSession = {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        },
        can: session.can,
        role: session.role ? { name: session.role.name } : null,
    } as AppSession;

    return (
        <HydrateClient>
            <SessionHydrator session={clientSession} />
            <div className="relative">
                <SidebarContent initialAuth={initialAuth}>
                    {children}
                </SidebarContent>

                <GlobalSheetsProvider />
                <GlobalModalsProvider />
                <div
                    data-dashboard-floating-stack
                    className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
                >
                    <Env isDev>
                        <InboundNeedsAttentionProviderLazy />
                    </Env>
                    <TaskNotificationProvider />
                </div>

                {/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
            </div>
        </HydrateClient>
    );
}
