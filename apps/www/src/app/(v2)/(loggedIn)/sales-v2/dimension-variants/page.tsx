import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { DimensionList } from "./_actions/list";
import { getHousePackageTool } from "./_actions/get-house-package-tool";
import { unstable_noStore } from "next/cache";

export default async function housePackageToolPage() {
    unstable_noStore();
    const data = await getHousePackageTool();
    console.log(data);
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
