import { withDeleted } from "@/app/(clean-code)/_common/utils/db-utils";
import { user } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { generateSalesSlug } from "@sales/utils/utils";

export async function generateSalesId(type) {
    return await generateSalesSlug(
        type,
        prisma.salesOrders,
        (await user()).name,
    );
}
