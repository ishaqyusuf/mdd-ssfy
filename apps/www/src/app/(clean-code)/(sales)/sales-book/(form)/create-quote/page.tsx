import FPage from "@/components/(clean-code)/fikr-ui/f-page";

import { FormClient } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/form-client";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { createSalesBookFormUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";

export async function generateMetadata({ params }) {
    return constructMetadata({
        title: `Create Quote - gndprodesk.com`,
    });
}
export default async function CreateOrderPage({}) {
    const data = await createSalesBookFormUseCase({
        type: "quote",
    });

    return (
        <FPage className="" title="Create Quote">
            <FormClient data={data} />
        </FPage>
    );
}
