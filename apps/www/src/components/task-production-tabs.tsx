import Link from "@/components/link";
import { getSalesProductionQueryTabs } from "@/actions/get-sales-production-query-tab";
import useEffectLoader from "@/lib/use-effect-loader";

import { Badge } from "@gnd/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

export function TaskProductionTabs({}) {
    const data = useEffectLoader(getSalesProductionQueryTabs);

    if (!data?.data?.length) return null;
    return (
        <div className="my-2 px-4">
            {/* {JSON.stringify(data?.data)} */}
            <Tabs className="min-w-[400px] font-mono ">
                <TabsList>
                    {data?.data?.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            asChild
                            value={tab.value}
                            className="uppercase"
                        >
                            <Link href={``}>
                                {tab.title}
                                <Badge
                                    variant="destructive"
                                    className="mx-2 px-2"
                                >
                                    {tab.count}
                                </Badge>
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    );
}
