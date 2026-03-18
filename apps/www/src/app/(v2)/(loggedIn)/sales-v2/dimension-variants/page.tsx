import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { DimensionList } from "@/app-deps/(v2)/(loggedIn)/sales-v2/dimension-variants/_actions/list";
import { getHousePackageTool } from "@/app-deps/(v2)/(loggedIn)/sales-v2/dimension-variants/_actions/get-house-package-tool";
import { unstable_noStore } from "next/cache";

export default async function housePackageToolPage() {
    unstable_noStore();
    const data = await getHousePackageTool();

    return (
        <div>
            <Breadcrumbs>
                <BreadLink isFirst title="Sales" />
                <BreadLink title="v2" />
                <BreadLink isLast title="House Package Tool" />
            </Breadcrumbs>
            <DimensionList data={data} />
        </div>
    );
}
