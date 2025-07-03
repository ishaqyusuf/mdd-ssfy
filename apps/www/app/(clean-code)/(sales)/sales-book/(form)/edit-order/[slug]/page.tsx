import { getSalesBookFormUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { FormClient } from "../../_components/form-client";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { prisma } from "@/db";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Edit Order | ${params.slug} - gndprodesk.com`,
    });
}
export default async function Page({ params }) {
    let slug = params.slug;
    const o = await prisma.salesOrders.findFirstOrThrow({
        where: {
            slug,
        },
    });
    const data = await getSalesBookFormUseCase({
        type: "order",
        slug: params.slug,
    });
    return (
        <FPage
            className=""
            title={`Edit Order | ${data.order.orderId?.toUpperCase()}`}
        >
            <FormClient data={data} />
        </FPage>
    );
}
