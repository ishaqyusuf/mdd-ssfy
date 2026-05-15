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

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        {invite?.auth ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {invite.auth.email}
              </p>
              <h1 className="text-2xl font-semibold">
                {invite.auth.companyName || invite.auth.name || "Dealer setup"}
              </h1>
            </div>
            <DealerPasswordForm token={token} />
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Link unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This dealer setup link is invalid, expired, or already used.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
