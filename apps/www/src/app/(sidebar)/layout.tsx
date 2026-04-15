import { authOptions } from "@/lib/auth-options";
import { GlobalModals } from "@/components/modals/global-modals";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotification } from "@/components/task-notification";
import { HydrateClient } from "@/trpc/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
            <div className="relative">
                <SidebarContent initialAuth={initialAuth}>
                    {children}
                </SidebarContent>

                <Suspense>
                    <GlobalSheets />
                    <GlobalModals />
                    <TaskNotification />
                </Suspense>

                {/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
            </div>
        </HydrateClient>
    );
}
