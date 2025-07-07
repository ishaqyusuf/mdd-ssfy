import { dealerSession, serverSession } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export async function getLoggedInDealerAccountDta() {
    const dealerMode = await dealerSession();
    const auth = await serverSession();
    return dealerMode
        ? await prisma.dealerAuth.findFirstOrThrow({
              where: {
                  id: auth.user.id,
              },
              include: {
                  primaryBillingAddress: true,
                  primaryShippingAddress: true,
                  dealer: {
                      include: {
                          addressBooks: true,
                      },
                  },
              },
          })
        : null;
}
