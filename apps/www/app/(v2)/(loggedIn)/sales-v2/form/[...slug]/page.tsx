import SalesFormComponent from "../components";
import { getDykeFormAction } from "../_action/get-dyke-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { copyDykeSales } from "@/app/(v1)/(loggedIn)/sales/_actions/copy-dyke-sale";
import { getErrorData } from "../_action/error/save-error";
import { prisma } from "@/db";
import MigrateStepDuplicateUid from "./_debug/migrate-steps-duplicate-uid";
import { groupBy } from "lodash";

export async function generateMetadata({ params, searchParams }) {
    const [type, slug] = params.slug;
    const title = `${slug ? "Edit " : "New "} ${type} ${
        slug ? `| ${slug}` : ""
    }`;
    return {
        title,
    };
}
export default async function SalesForm({ params, searchParams }) {
    const [type, slug] = params.slug;
    let copy = searchParams.copy;

    const form = searchParams.errorId
        ? await getErrorData(searchParams.errorId)
        : copy
        ? await copyDykeSales(copy, type)
        : await getDykeFormAction(type, slug, searchParams);
    if (!form) throw Error("Errorr...");
    return (
        <AuthGuard can={["editOrders"]}>
            <div className="sm:px-8 px-4">
                <Breadcrumbs>
                    <BreadLink title={"Sales"} isFirst link={"/sales/orders"} />
                    {slug && (
                        <BreadLink
                            title={slug}
                            link={`/sales-v2/overview/${type}/${slug}`}
                        />
                    )}
                    <BreadLink title={slug ? "Edit" : "New"} isLast />
                    {/* <BreadLink title={orderId ? "Edit" : "New"} isLast /> */}
                </Breadcrumbs>
                <SalesFormComponent defaultValues={form} />
            </div>
        </AuthGuard>
    );
}
