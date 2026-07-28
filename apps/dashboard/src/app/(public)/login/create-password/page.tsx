import { CreateAuthAccountPasswordForm } from "@/components/create-auth-account-password-form";
import { AuthResetShell } from "@/components/auth-reset-shell";
import { Icons } from "@gnd/ui/icons";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
    title: "Create Password | GND",
};

export default async function Page() {
    return (
        <PageShell>
            <AuthResetShell
                eyebrow="Account upgrade"
                title="Create your new password"
                description="Choose a new password to finish securing your workspace account."
                icon={<Icons.LockKeyhole className="size-5" />}
            >
                <CreateAuthAccountPasswordForm />
            </AuthResetShell>
        </PageShell>
    );
}
