import { getShelfItems } from "@/app/(v2)/(loggedIn)/sales-v2/products/_actions/get-shelf-items";
import { Shell } from "@/components/shell";
import BlogsTable from "./blogs-table";
import { getBlogsAction } from "./_actions/get-blogs-action";

export default async function BlogsPage(props) {
    const searchParams = await props.searchParams;
    const promise = getBlogsAction(searchParams);

    return (
        <div>
            <Shell className="">
                <BlogsTable promise={promise} />
            </Shell>
        </div>
    );
}
