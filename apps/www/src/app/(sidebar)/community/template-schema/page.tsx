import { constructMetadata } from "@gnd/utils/construct-metadata";
import { batchPrefetch } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { NewBlockAction } from "@/components/forms/community-template-schema/new-block-action";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Template Schema | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;

    batchPrefetch([]);
    return (
        <div className="flex flex-col p-4 gap-6">
            <PageTitle>Template Schema</PageTitle>
            <div className="flex">
                <div className="flex-1"></div>
                <NewBlockAction />
            </div>
        </div>
    );
}

