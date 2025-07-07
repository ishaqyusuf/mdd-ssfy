import { ISalesType } from "@/types/sales";
import { getSalesAction } from "./action";
import AuthGuard from "../../_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { capitalizeFirstLetter } from "@/lib/utils";

export async function generateMetadata({ params, searchParams }) {
    const type = params.type;
    // const title = `${type}`;
    const title = `${capitalizeFirstLetter(type)}s`;
    return {
        title,
    };
}

export default async function SalesPage({ searchParams, params }) {
    const type: ISalesType = params.type;

    const promise = getSalesAction({
        ...searchParams,
        type,
    });
    const title = capitalizeFirstLetter(type);
    return (
        <AuthGuard
            can={
                type == "order"
                    ? ["viewOrders"]
                    : type == "quote"
                    ? ["viewEstimates"]
                    : ["viewInvoice"]
            }
        >
            <Breadcrumbs>
                <BreadLink isFirst title="Sales" />
                <BreadLink isLast title={`${title}s`} />
            </Breadcrumbs>
        </AuthGuard>
    );
}
