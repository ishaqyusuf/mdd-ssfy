import { ISalesType } from "@/types/sales";
import { getSalesAction } from "./action";
import AuthGuard from "../../_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { capitalizeFirstLetter } from "@/lib/utils";

export async function generateMetadata(props) {
    const params = await props.params;
    const type = params.type;
    // const title = `${type}`;
    const title = `${capitalizeFirstLetter(type)}s`;
    return {
        title,
    };
}

export default async function SalesPage(props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
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
