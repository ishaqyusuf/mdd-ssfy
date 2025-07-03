import { FPageTabs } from "@/components/(clean-code)/fikr-ui/f-page-tabs";
import { getSalesTabActionUseCase } from "../../../_common/use-case/sales-book-tabs";

export default async function PagesTab() {
    const tabs = getSalesTabActionUseCase();
    return <FPageTabs port promise={tabs} />;
}
