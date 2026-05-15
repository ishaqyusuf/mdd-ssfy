import { getDealerAuthSession } from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import { getActiveDealerByAuthUserId } from "@gnd/db/queries";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireDealer() {
  const session = await getDealerAuthSession(await headers());

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dealer = await getActiveDealerByAuthUserId(db, session.user.id);

  if (!dealer) {
    redirect("/login?error=dealer");
  }

  return {
    session,
    dealer,
  };
}
