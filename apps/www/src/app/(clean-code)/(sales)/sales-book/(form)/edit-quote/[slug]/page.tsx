import { getSalesBookFormUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { FormClient } from "../../_components/form-client";
import { prisma } from "@/db";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { fixUndefinedOrderIdAction } from "@/actions/--fix/fix-undefined-order-id";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Edit Quote | ${params.slug} - gndprodesk.com`,
    });
}
export default async function EditQuotePage({ params, searchParams }) {
    let slug = params.slug;
    await fixUndefinedOrderIdAction(slug, "quote");

    // console.log(s);
    const data = await getSalesBookFormUseCase({
        type: "quote",
        slug: params.slug,
        ...searchParams,
    });

    return (
        <FPage
            className=""
            title={`Edit Quote | ${data.order.orderId?.toUpperCase()}`}
        >
            <FormClient data={data} />
        </FPage>
    );
}
