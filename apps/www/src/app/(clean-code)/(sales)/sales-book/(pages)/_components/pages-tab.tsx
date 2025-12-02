import { getSalesTabActionUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-tabs";
import { FPageTabs } from "@/components/(clean-code)/fikr-ui/f-page-tabs";

export default async function PagesTab() {
    const tabs = getSalesTabActionUseCase();
    return <FPageTabs port promise={tabs} />;
}
