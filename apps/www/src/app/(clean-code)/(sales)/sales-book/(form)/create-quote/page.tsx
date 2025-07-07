import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { createSalesBookFormUseCase } from "../../../_common/use-case/sales-book-form-use-case";
import { FormClient } from "../_components/form-client";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Create Quote - gndprodesk.com`,
    });
}
export default async function CreateOrderPage({}) {
    const data = await createSalesBookFormUseCase({
        type: "quote",
    });
    // console.log(data.order.type);
    return (
        <FPage className="" title="Create Quote">
            <FormClient data={data} />
        </FPage>
    );
}
