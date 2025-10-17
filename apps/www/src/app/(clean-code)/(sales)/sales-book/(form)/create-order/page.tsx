import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import { FormClient } from "../_components/form-client";
import { createSalesBookFormUseCase } from "../../../_common/use-case/sales-book-form-use-case";

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
