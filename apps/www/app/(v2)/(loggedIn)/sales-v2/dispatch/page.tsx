import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import AuthGuard from "../../_components/auth-guard";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import DispatchPageClient from "./page-client";
import { getDispatchSalesAction } from "./_actions/get-dispatchs";

export interface DispatchPageProps {}

export async function generateMetadata({ searchParams }) {
    return {
        title: `Sales Dispatch`,
    };
}
export default async function SalesDispatchPage(props) {
    const searchParams = await props.searchParams;
    const response = getDispatchSalesAction(searchParams);
    return (
        <FPage title="Sales Dispatch">
            <DispatchPageClient response={response} />
        </FPage>
    );
}
