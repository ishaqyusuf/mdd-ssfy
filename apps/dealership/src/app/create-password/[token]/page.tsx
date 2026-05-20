import { DealerAuthLayout } from "@/components/dealer-auth-layout";
import { DealerPasswordForm } from "./form";
import { db } from "@gnd/db";
import { getDealerOnboardingInvite } from "@gnd/db/queries";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function DealerCreatePasswordPage({ params }: Props) {
  const { token } = await params;
  const invite = await getDealerOnboardingInvite(db, token);

  const dealerName =
    invite?.auth?.companyName || invite?.auth?.name || "Dealer setup";

  return (
    <DealerAuthLayout
      contextLabel={invite?.auth ? invite.auth.email : undefined}
      description={
        invite?.auth
          ? "Create a secure password to activate your dealer portal for quotes, orders, customers, and company settings."
          : "This dealer setup link is invalid, expired, or already used. Ask your GND contact for a fresh invitation."
      }
      eyebrow={invite?.auth ? "Dealer invitation" : "Invitation unavailable"}
      state={invite?.auth ? "default" : "error"}
      title={invite?.auth ? `Set up ${dealerName}` : "Link unavailable"}
    >
      {invite?.auth ? (
        <DealerPasswordForm token={token} />
      ) : (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
          This onboarding link can no longer be used.
        </div>
      )}
    </DealerAuthLayout>
  );
}
