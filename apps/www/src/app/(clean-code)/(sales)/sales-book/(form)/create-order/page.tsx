import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import { FormClient } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/form-client";
import { createSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { Metadata } from "next";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Create Order - gndprodesk.com`,
    });
}

export default async function CreateOrderPage({}) {
    const data = await createSalesBookFormUseCase({
        type: "order",
    });
    return (
        <FPage className="" title="Create Order">
            <FormClient data={data} />
        </FPage>
    );
}
