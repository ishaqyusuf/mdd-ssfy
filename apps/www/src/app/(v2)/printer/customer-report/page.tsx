import BasePrinter from "@/app-deps/(v2)/printer/base-printer";
import { generateCustomerPrintReport } from "@/app-deps/(v2)/printer/customer-report/_action";
import ReportCtx from "@/app-deps/(v2)/printer/customer-report/report-ctx";

export default async function CustomerReportPage(
    props: {
        searchParams;
    }
) {
    const searchParams = await props.searchParams;
    const ids = searchParams.slugs
        ?.split(",")
        .map((v) => Number(v))
        .filter((v) => v > 0);
    const value = {
        ...searchParams,
    };
    const { _having, _due } = searchParams;
    const actions = ids?.map((id) => ({
        slug: id,
        action: generateCustomerPrintReport(id, {
            _having,
            _due,
        }),
    }));

    return (
        <BasePrinter {...value} slugs={ids}>
            {actions.map((action) => (
                <ReportCtx key={action.slug} {...action} />
            ))}
        </BasePrinter>
    );
}
